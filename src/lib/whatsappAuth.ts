import { supabase } from './supabaseClient';

const WHATSAPP_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-auth`;

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function call(
  action: 'request' | 'verify',
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(WHATSAPP_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error ?? 'Erro desconhecido ao iniciar sessão.');
  }
  return data;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocorreu um erro ao iniciar sessão.';
}

export async function requestWhatsAppCode(phone: string): Promise<{ error: string | null }> {
  try {
    await call('request', { phone });
    return { error: null };
  } catch (err: unknown) {
    return { error: message(err) };
  }
}

export async function verifyWhatsAppCode(phone: string, code: string): Promise<{ error: string | null }> {
  try {
    const data = await call('verify', { phone, code });

    // A edge function devolve um token de sessão de uso único, não o email.
    // verifyOtp é o que troca esse token por uma sessão real no cliente. O type
    // tem de bater certo com o link gerado no servidor ('magiclink').
    const tokenHash = typeof data.token_hash === 'string' ? data.token_hash : '';
    if (!tokenHash) return { error: 'Código inválido. Tenta novamente.' };

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: message(err) };
  }
}
