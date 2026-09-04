import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { scheduleWelcomeNotification } from '@/lib/notifications';

const ONBOARDING_KEY_PREFIX = 'onboarding_completed';

export function useOnboarding() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    AsyncStorage.getItem(`${ONBOARDING_KEY_PREFIX}:${userId}`)
      .then((done) => {
        if (!active) return;
        const firstLogin = done !== '1';
        setShowTour(firstLogin);
        if (firstLogin) scheduleWelcomeNotification(userId).catch(() => {});
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [userId]);

  const completeTour = useCallback(async () => {
    if (!userId) return;
    setShowTour(false);
    try {
      await AsyncStorage.setItem(`${ONBOARDING_KEY_PREFIX}:${userId}`, '1');
    } catch {
      // ignore
    }
  }, [userId]);

  return { showTour, completeTour };
}
