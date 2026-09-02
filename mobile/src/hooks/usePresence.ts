import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { displayName } from '@/core/format';

const HEARTBEAT_MS = 60_000;

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const write = async (status: 'online' | 'offline') => {
      try {
        await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: user.id,
              display_name: displayName(user),
              status,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );
      } catch {
        // ignore
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      write('online');
      timer = setInterval(() => write('online'), HEARTBEAT_MS);
    };

    const stopHeartbeat = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startHeartbeat();
      } else {
        write('offline');
        stopHeartbeat();
      }
    });

    write('online');
    startHeartbeat();

    return () => {
      stopHeartbeat();
      sub.remove();
      write('offline');
    };
  }, [user]);
}

export function Presence() {
  usePresence();
  return null;
}
