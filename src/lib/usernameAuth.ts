import { supabase } from './supabaseClient';

const USERNAME_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/username-auth`;

type UsernameAction = 'signin' | 'create';

async function call(
  action: UsernameAction,
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(USERNAME_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ action, username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    return { error: data.error ?? 'Não foi possível iniciar sessão.' };
  }

  // O edge function devolve um token de sessão de uso único, nunca o email.
  // verifyOtp é o que troca esse token por uma sessão real no cliente. O type
  // tem de bater certo com o link gerado no servidor ('magiclink').
  const tokenHash = typeof data.token_hash === 'string' ? data.token_hash : '';
  if (!tokenHash) return { error: 'Não foi possível iniciar sessão.' };

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
  return call('signin', username.trim().toLowerCase(), password);
}

export async function createAccountWithUsername(
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  return call('create', username.trim().toLowerCase(), password);
}
