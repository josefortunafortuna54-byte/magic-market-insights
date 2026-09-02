import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

const SIGNALS_FN = `${SUPABASE_URL}/functions/v1/generate-crypto-signals`;

let attempted = false;
let inFlight = false;

export interface GenerateSignalsResult {
  ok: boolean;
  count: number;
  error?: string;
  transient?: boolean;
}

let lastResult: GenerateSignalsResult | null = null;
let listeners: Array<() => void> = [];

export function onGenerateSignalsChange(cb: () => void): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

export function getGeneratingState() {
  return { inFlight, lastResult };
}

function notify() { listeners.forEach((l) => l()); }

export async function generateSignalsNow(): Promise<GenerateSignalsResult> {
  if (inFlight) return lastResult ?? { ok: false, count: 0, error: 'A gerar...' };

  inFlight = true;
  lastResult = null;
  notify();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const r = { ok: false, count: 0, error: 'Sem sessão' };
      lastResult = r;
      notify();
      return r;
    }

    const res = await fetch(SIGNALS_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(80_000),
    });

    const data = await res.json().catch(() => ({}));
    const count = Array.isArray(data?.signals) ? data.signals.length : 0;
    if (!res.ok || count === 0) {
      console.warn('[generateSignalsNow]', { status: res.status, data });
    }
    const serverError = !res.ok
      ? (data?.error || data?.message || `HTTP ${res.status}`)
      : count === 0 && res.ok
        ? (data?.tech_rejected != null ? `${data.tech_rejected} sinais rejeitados pelo validador técnico` : 'Nenhum sinal encontrado agora. Tenta novamente.')
        : undefined;
    const r: GenerateSignalsResult = {
      ok: res.ok,
      count,
      error: serverError,
    };
    lastResult = r;
    notify();
    return r;
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : 'Erro desconhecido';
    const name = e instanceof Error ? e.name : '';
    const transient =
      name === 'TimeoutError' ||
      name === 'AbortError' ||
      /cancel|abort|network/i.test(raw);
    const msg = transient ? 'Ligação interrompida ou timeout. Tenta novamente.' : raw;
    if (transient) {
      console.warn('[generateSignalsNow] (transitório)', raw);
    } else {
      console.error('[generateSignalsNow]', raw);
    }
    const r: GenerateSignalsResult = { ok: false, count: 0, error: msg, transient };
    lastResult = r;
    notify();
    return r;
  } finally {
    inFlight = false;
    notify();
  }
}

export async function ensureWeekendCryptoSignals(): Promise<void> {
  if (attempted || inFlight) return;
  attempted = true;
  const r = await generateSignalsNow();
  if (!r.ok && r.transient) {
    attempted = false;
  }
}
