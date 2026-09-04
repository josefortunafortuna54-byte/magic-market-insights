import { supabase } from './supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { i18n } from '@/lib/i18n';

const WHATSAPP_FN = `${SUPABASE_URL}/functions/v1/whatsapp-auth`;

async function call(
  action: 'request' | 'verify',
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(WHATSAPP_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error ?? i18n.t('authErrors.whatsappUnknown'));
  }
  return data;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : i18n.t('authErrors.whatsappError');
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
    const email = typeof data.email === 'string' ? data.email : '';
    if (!email) return { error: i18n.t('authErrors.whatsappInvalidCode') };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: code.trim(),
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: message(err) };
  }
}
