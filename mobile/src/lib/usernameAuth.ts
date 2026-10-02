import { supabase } from './supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { i18n } from '@/lib/i18n';
import { normalizeUsername } from './usernameRules';

const USERNAME_FN = `${SUPABASE_URL}/functions/v1/username-auth`;

type UsernameAction = 'signin' | 'create';

async function call(
  action: UsernameAction,
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  const res = await fetch(USERNAME_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    return { error: data.error ?? i18n.t('authErrors.usernameGeneric') };
  }

  // O edge function devolve um token de sessao de uso unico, nunca o email.
  // verifyOtp e o que troca esse token por uma sessao real no cliente. O type
  // tem de bater certo com o link gerado no servidor ('magiclink').
  const tokenHash = typeof data.token_hash === 'string' ? data.token_hash : '';
  if (!tokenHash) {
    return { error: i18n.t('authErrors.usernameGeneric') };
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (error) return { error: error.message };

  return { error: null };
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  return call('signin', normalizeUsername(username), password);
}

export async function createAccountWithUsername(
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  return call('create', normalizeUsername(username), password);
}
