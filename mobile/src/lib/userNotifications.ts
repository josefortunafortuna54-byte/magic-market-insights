import { supabase } from '@/lib/supabase';

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  created_at: string;
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Notificações persistentes gravadas pelo servidor (ex.: resultado da
 * análise de comprovativos). RLS garante que cada utilizador só vê as suas.
 */
export async function fetchUserNotifications(limit = 30): Promise<UserNotification[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, title, body, kind, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as UserNotification[];
}

export async function countUnreadUserNotifications(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAllUserNotificationsRead(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase
    .from('user_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function deleteUserNotification(id: string): Promise<void> {
  await supabase.from('user_notifications').delete().eq('id', id);
}

export async function clearUserNotifications(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from('user_notifications').delete().eq('user_id', userId);
}
