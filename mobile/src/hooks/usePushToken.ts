import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getExpoPushToken } from '@/lib/notifications';

/**
 * Regista/remove o token de push do Expo na tabela push_tokens:
 *  - ao iniciar sessão (ou quando o utilizador muda) → upsert do token atual
 *  - ao terminar sessão → remove o token do dispositivo
 * O envio em si é feito pela edge function send-notification.
 */
export function usePushToken() {
  const { user } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const previous = prevUserId.current;
    prevUserId.current = user?.id ?? null;

    if (!user) {
      if (previous) {
        (async () => {
          try {
            await supabase.from('push_tokens').delete().eq('user_id', previous);
          } catch {
            // ignore
          }
        })();
      }
      return;
    }

    if (user.id === previous) return;

    let cancelled = false;
    (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      try {
        await supabase.from('push_tokens').upsert(
          {
            user_id: user.id,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);
}

export function PushTokenInit() {
  usePushToken();
  return null;
}
