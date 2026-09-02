import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { STRIPE_CHECKOUT_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { i18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import type { Subscription } from '@/core/types';

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export type PlanTier = 'free' | 'basic' | 'pro' | 'premium';

// Espelha get_user_plan() no servidor: status ativo E dentro do período.
const withinPeriod = (s: Subscription | null): boolean => {
  if (!s) return false;
  const end = s.current_period_end ?? null;
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [periodActive, setPeriodActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setPeriodActive(false);
      setLoading(false);
      return;
    }
    // .limit(1) em vez de .maybeSingle(): linhas duplicadas devolvem null e
    // bloqueariam um utilizador premium que pagou. A mais recente é a válida.
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1);
    const latest = ((data as Subscription[] | null) ?? [])[0] ?? null;
    setSubscription(latest);
    setPeriodActive(withinPeriod(latest));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    if (!user) return () => clearTimeout(timer);

    const cleanup = subscribeToChanges('subscriptions', [
      {
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
        onEvent: () => fetchData(),
      },
    ]);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [user, fetchData]);

  const isPremium = subscription?.status === 'active' && periodActive;

  const planName = (subscription?.plan ?? '').toLowerCase();
  const planTier: PlanTier = isPremium
    ? planName === 'basic' || planName === 'pro' || planName === 'premium'
      ? planName
      : 'premium'
    : 'free';

  const canAccessBanca = isPremium && planTier === 'premium';

  const checkout = async (priceId: string, currency: string): Promise<CheckoutResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'no_session' };

    try {
      const res = await fetch(STRIPE_CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ priceId, currency }),
      });
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error };
      if (!data.url) return { ok: false, error: i18n.t('planos.urlMissing') };
      return { ok: true, url: data.url };
    } catch {
      return { ok: false, error: i18n.t('planos.connectionError') };
    }
  };

  return { user, subscription, isPremium, planTier, canAccessBanca, loading, checkout };
}
