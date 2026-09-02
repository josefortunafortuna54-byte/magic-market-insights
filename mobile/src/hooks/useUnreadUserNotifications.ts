import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { countUnreadUserNotifications } from '@/lib/userNotifications';

const QUERY_KEY = ['user-notifications-unread'];

// Canal partilhado: várias instâncias do hook podem estar montadas ao mesmo
// tempo (react-navigation mantém tabs montadas) e supabase.channel() devolve
// o MESMO canal para o mesmo tópico — chamar .on() após subscribe() lança
// "cannot add postgres_changes callbacks after subscribe()". Ref-count evita
// isso e só remove o canal quando a última instância desmonta.
let sharedChannel: RealtimeChannel | null = null;
let sharedChannelUserId: string | null = null;
let refCount = 0;

function subscribeShared(user: { id: string }, onInvalidation: () => void): RealtimeChannel {
  if (sharedChannel && sharedChannelUserId !== user.id) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedChannelUserId = null;
  }
  if (!sharedChannel) {
    sharedChannelUserId = user.id;
    sharedChannel = supabase
      .channel(`user-notifs-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => onInvalidation(),
      )
      .subscribe();
    return sharedChannel;
  }
  return sharedChannel;
}

/**
 * Conta notificações server-side não lidas (user_notifications.read = false).
 * Atualiza em tempo real via postgres_changes e faz polling de segurança.
 * Usado pelo sino no header do dashboard.
 */
export function useUnreadUserNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? 'anon'],
    queryFn: countUnreadUserNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    const channel = subscribeShared(user, invalidate);
    refCount++;

    return () => {
      refCount--;
      if (refCount === 0 && sharedChannel === channel) {
        supabase.removeChannel(channel);
        sharedChannel = null;
        sharedChannelUserId = null;
      }
    };
  }, [user, queryClient]);

  return { unread: query.data ?? 0 };
}
