import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Garante que mensagens do servidor (ex.: "Plano ativado") chegam ao
 * utilizador em tempo real: para além do push Expo, cada nova linha em
 * user_notifications é apresentada imediatamente como notificação local.
 */
export function UserNotificationWatcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const channel = supabase
      .channel(`user-notifs-live-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { title?: string; body?: string; kind?: string } | null;
          if (!row?.title) return;
          Notifications.scheduleNotificationAsync({
            content: {
              title: row.title,
              body: row.body ?? '',
              data: { url: '/notificacoes', kind: row.kind ?? 'system' },
              sound: Platform.OS === 'ios' ? 'default' : undefined,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: Platform.OS === 'android' ? 'planos' : undefined,
            },
          }).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
