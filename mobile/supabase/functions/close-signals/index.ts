// close-signals — Fecha sinais ativos/pending atingindo TP ou SL ou expirando.
// Usa Binance (crypto), Twelve Data (forex intraday) ou frankfurter (forex fallback).
// Chamado pelo admin via botão "Fechar TP/SL" no painel.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { decideClose, pipsOf, riskRewardOf } from '../_shared/close-decision.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') ?? '';
const adminEmails = adminEmailsRaw
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// ── Price fetching ──────────────────────────────────────────────────────────

const CRYPTO_SYMBOLS: Record<string, string> = {
  BTCUSD: 'BTCUSDT',
  BTCUSDT: 'BTCUSDT',
  ETHUSD: 'ETHUSDT',
  ETHUSDT: 'ETHUSDT',
};

const FOREX_PAIRS: Record<string, { base: string; quote: string }> = {
  EURUSD: { base: 'EUR', quote: 'USD' },
  GBPUSD: { base: 'GBP', quote: 'USD' },
  USDJPY: { base: 'USD', quote: 'JPY' },
  AUDUSD: { base: 'AUD', quote: 'USD' },
  EURGBP: { base: 'EUR', quote: 'GBP' },
  USDCHF: { base: 'USD', quote: 'CHF' },
  NZDUSD: { base: 'NZD', quote: 'USD' },
  USDCAD: { base: 'USD', quote: 'CAD' },
  XAUUSD: { base: 'XAU', quote: 'USD' },
};

function normalizeSymbol(sym: string): string {
  return sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const binanceSymbol = CRYPTO_SYMBOLS[normalizeSymbol(symbol)];
  if (!binanceSymbol) return null;
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
    );
    const data = await res.json();
    return Number(data?.price) || null;
  } catch {
    return null;
  }
}

const TWELVE_DATA_KEY = Deno.env.get('TWELVE_DATA_KEY') ?? '';
const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  XAUUSD: 'XAU/USD', EURGBP: 'EUR/GBP', USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD',
};

async function fetchTwelveDataPrice(symbol: string): Promise<number | null> {
  const tdSymbol = TWELVE_DATA_SYMBOLS[normalizeSymbol(symbol)];
  if (!tdSymbol || !TWELVE_DATA_KEY) return null;
  try {
    const res = await fetch(`https://api.twelvedata.com/price?symbol=${tdSymbol}&apikey=${TWELVE_DATA_KEY}`);
    const data = await res.json();
    if (data.status === 'error') return null;
    return Number(data?.price) || null;
  } catch { return null; }
}

async function fetchForexPrice(symbol: string): Promise<number | null> {
  const pair = FOREX_PAIRS[normalizeSymbol(symbol)];
  if (!pair) return null;
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${pair.base}&to=${pair.quote}`,
    );
    const data = await res.json();
    return Number(data?.rates?.[pair.quote]) || null;
  } catch {
    return null;
  }
}

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  const norm = normalizeSymbol(symbol);
  if (CRYPTO_SYMBOLS[norm]) return fetchCryptoPrice(symbol);
  // Try Twelve Data first (real-time intraday price), fallback to Frankfurter
  if (TWELVE_DATA_KEY) {
    const tdPrice = await fetchTwelveDataPrice(symbol);
    if (tdPrice !== null) return tdPrice;
  }
  return fetchForexPrice(symbol);
}

function hasKnownSource(symbol: string): boolean {
  const norm = normalizeSymbol(symbol);
  if (CRYPTO_SYMBOLS[norm]) return true;
  if (TWELVE_DATA_SYMBOLS[norm] && TWELVE_DATA_KEY) return true;
  return Boolean(FOREX_PAIRS[norm]);
}

// ── Admin check ─────────────────────────────────────────────────────────────

// O service-role valida-se perguntando ao gateway: so devolve 200 a uma chave
// com assinatura JWT valida e papel service_role, logo um JWT forjado falha aqui.
// A comparacao de strings com o segredo nunca casava: o segredo injectado pela
// plataforma e a chave de api-keys nao sao o mesmo valor.
async function isServiceRoleToken(jwt: string): Promise<boolean> {
  if (!jwt || !supabaseUrl) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: jwt, Authorization: `Bearer ${jwt}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { user: null, error: 'Não autenticado.', isServiceRole: false };

  // Service role key (from pg_cron) — skip admin check
  if (jwt === serviceRoleKey) return { user: null, error: null, isServiceRole: true };
  if (await isServiceRoleToken(jwt)) return { user: null, error: null, isServiceRole: true };

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return { user: null, error: 'Não autenticado.', isServiceRole: false };

  const email = (user.email ?? '').trim().toLowerCase();
  if (!adminEmails.includes(email)) {
    return { user: null, error: 'Acesso negado.', isServiceRole: false };
  }

  return { user, error: null, isServiceRole: false };
}

// ── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);

  const { user, error: authError } = await verifyAdmin(req);
  if (authError) return errorJson(authError, 401);

  // Buscar sinais ativos/pending
  const { data: signals, error: fetchError } = await supabase
    .from('signals')
    .select('*')
    .in('status', ['active', 'pending']);

  if (fetchError) return errorJson(fetchError.message, 500);
  if (!signals || signals.length === 0) {
    return json({ closed: 0, activated: 0, skipped: 0, skippedDetalhe: [] });
  }

  let closed = 0;
  let activated = 0;
  // PromiseLike e nao Promise: o query builder do supabase-js e thenable, mas
  // nao implementa `catch`/`finally`. `Promise.all` aceita qualquer
  // `Iterable<PromiseLike>`, por isso o consumo no fim do loop nao muda.
  const updates: PromiseLike<{ error: unknown }>[] = [];
  const skipped: { symbol: string; id: string; motivo: string }[] = [];

  for (const signal of signals) {
    const price = await fetchCurrentPrice(signal.symbol);
    if (price === null) {
      skipped.push({
        symbol: String(signal.symbol),
        id: signal.id,
        motivo: hasKnownSource(signal.symbol)
          ? 'as fontes de preco nao responderam'
          : 'nao ha fonte de preco para este simbolo',
      });
      continue;
    }

    const entry = Number(signal.entry_price);
    const sl = Number(signal.stop_loss);
    const tp = Number(signal.target_price);
    const type = String(signal.signal_type).toUpperCase();
    const currentStatus = String(signal.status);

    // ── SINAL PENDENTE: verificar se preço atingiu entry ──
    if (currentStatus === 'pending') {
      const diff = Math.abs(price - entry);
      const entryPct = entry > 0 ? (diff / entry) * 100 : 999;

      // Ativar se preço está dentro de 0.15% do entry
      if (entryPct <= 0.15) {
        updates.push(
          supabase
            .from('signals')
            .update({ status: 'active' })
            .eq('id', signal.id)
            .then((res) => {
              if (!res.error) activated++;
              return res;
            }),
        );
        continue;
      }
    }

    const outcome = decideClose({
      signalType: type,
      price,
      entry,
      sl,
      tp,
      currentStatus,
      expiresAt: signal.expires_at,
      now: new Date(),
    });
    if (!outcome) continue;

    updates.push(
      supabase
        .from('signals')
        .update({ status: outcome })
        .eq('id', signal.id)
        .then(async (res) => {
          if (!res.error) {
            closed++;
            await supabase.from('signal_outcomes').insert({
              signal_id: signal.id,
              symbol: signal.symbol,
              timeframe: signal.timeframe,
              signal_type: signal.signal_type,
              smc_setup: signal.smc_setup || null,
              session_name: null,
              entry_price: entry,
              exit_price: price,
              stop_loss: sl,
              target_price: tp,
              result: outcome,
              pips_result: pipsOf(outcome, entry, sl, tp, String(signal.symbol)),
              risk_reward: Math.round(riskRewardOf(entry, sl, tp) * 100) / 100,
              confidence: signal.confidence,
              tech_score: null,
              closed_at: new Date().toISOString(),
            });
          }
          return res;
        }),
    );
  }

  await Promise.all(updates);

  console.log(
    `[close-signals] fechados=${closed} ativados=${activated} sem preco=${skipped.length} de ${signals.length} sinais`,
  );
  if (skipped.length > 0) {
    console.log('[close-signals] sem preco:', JSON.stringify(skipped));
  }
  return json({ closed, activated, skipped: skipped.length, skippedDetalhe: skipped });
});
