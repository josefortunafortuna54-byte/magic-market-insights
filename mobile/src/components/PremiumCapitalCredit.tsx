import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { BANCA_DEFAULTS, BANCA_STORAGE_KEY } from '@/hooks/useBanca';
import {
  consumePendingPlanPayment,
  getCapitalCreditedPeriod,
  getReferralCode,
  setCapitalCreditedPeriod,
} from '@/lib/referral';
import type { BancaConfig } from '@/core/types';

/**
 * Gestão de Capital: quando um utilizador chegado por link de afiliado tem o
 * plano premium ativado, o valor pago pelo premium passa a ser o saldo atual
 * da gestão de capital (capital = achieved = valor pago).
 */
export function PremiumCapitalCredit() {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  useEffect(() => {
    if (!user || !subscription) return;
    if (subscription.status !== 'active') return;
    if ((subscription.plan ?? '').toLowerCase() !== 'premium') return;

    let cancelled = false;
    (async () => {
      try {
        const period = subscription.current_period_end ?? 'none';
        const credited = await getCapitalCreditedPeriod(user.id);
        if (credited === period) return;

        const referral = await getReferralCode();
        if (!referral || cancelled) return; // só credita quem veio de afiliado

        const pending = await consumePendingPlanPayment('premium');
        if (!pending || cancelled) return;

        const raw = await AsyncStorage.getItem(BANCA_STORAGE_KEY);
        const current: BancaConfig = raw
          ? { ...BANCA_DEFAULTS, ...(JSON.parse(raw) as Partial<BancaConfig>) }
          : { ...BANCA_DEFAULTS };

        const next: BancaConfig = {
          ...current,
          capital: pending.amount,
          achieved: pending.amount,
          currency: pending.currency,
          startDate: current.startDate || new Date().toISOString(),
        };
        await AsyncStorage.setItem(BANCA_STORAGE_KEY, JSON.stringify(next));
        await setCapitalCreditedPeriod(user.id, period);
      } catch {
        // best-effort — não bloquear o arranque
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, subscription]);

  return null;
}
