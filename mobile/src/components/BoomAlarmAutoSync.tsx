import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useBoomHours } from '@/hooks/useBoomHours';
import { syncAutoBoomAlarms } from '@/lib/notifications';

/**
 * Garante que todas as janelas da Hora do Boom ficam com alarme armado
 * automaticamente — quando a hora chegar, o alarme dispara sem o
 * utilizador precisar de tocar em nada. Corrige a agenda sempre que o
 * utilizador volta ao app (AppState active).
 */
export function BoomAlarmAutoSync() {
  const { hours } = useBoomHours();
  const lastRun = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const run = (force = false) => {
      if (hours.length === 0) return;
      const now = Date.now();
      if (!force && now - lastRun.current < 60_000) return;
      lastRun.current = now;
      syncAutoBoomAlarms(hours).catch(() => {});
    };

    run(true);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run(true);
    });
    return () => sub.remove();
  }, [hours]);

  return null;
}