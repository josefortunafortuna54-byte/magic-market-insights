import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { i18n } from '@/lib/i18n';

const DELETE_ACCOUNT_FN = `${SUPABASE_URL}/functions/v1/delete-account`;

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('perfil.deleteAccountError'));

  const res = await fetch(DELETE_ACCOUNT_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ confirm: true }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || i18n.t('perfil.deleteAccountError'));
  }

  await supabase.auth.signOut();
}
