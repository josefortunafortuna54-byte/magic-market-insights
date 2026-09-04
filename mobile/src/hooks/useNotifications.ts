import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';
import {
  cancelPremiumExpiryNotifications,
  getInitialNotificationUrl,
  scheduleUpgradePrompt,
  subscribeToNotificationResponses,
  syncPremiumExpiryNotifications,
} from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    getInitialNotificationUrl().then((url) => {
      if (active && url) router.push(url as Href);
    });

    const sub = subscribeToNotificationResponses((url) => router.push(url as Href));

    return () => {
      active = false;
      sub.remove();
    };
  }, [router]);
}

export function useUpgradeNotification(delayMs = 6000) {
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();

  useEffect(() => {
    if (!user || loading || isPremium) return;
    const timer = setTimeout(() => {
      scheduleUpgradePrompt(user.id).catch(() => {});
    }, delayMs);
    return () => clearTimeout(timer);
  }, [user, isPremium, loading, delayMs]);
}

/**
 * Mantém os lembretes de expiração da subscrição sincronizados:
 * agenda 3 dias e 1 dia antes do `current_period_end`; cancela-os se a
 * subscrição deixar de estar activa. Renovação → periodEnd novo → re-agenda.
 */
export function usePremiumExpiryNotification(delayMs = 5000) {
  const { user } = useAuth();
  const { isPremium, loading, subscription } = useSubscription();
  const periodEnd = isPremium ? (subscription?.current_period_end ?? null) : null;

  useEffect(() => {
    if (!user || loading) return;
    if (periodEnd) {
      const timer = setTimeout(() => {
        syncPremiumExpiryNotifications(user.id, periodEnd).catch(() => {});
      }, delayMs);
      return () => clearTimeout(timer);
    }
    cancelPremiumExpiryNotifications(user.id).catch(() => {});
  }, [user, loading, periodEnd, delayMs]);
}
