import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

export type Currency = 'usd' | 'aoa';
export type PlanId = 'free' | 'basic' | 'pro' | 'premium';

export type PaymentMethod = 'binance' | 'rodotpay' | 'express';

export const WA_GREEN = '#25D366';

export const BINANCE_ID = '547723572';
export const RODOTPAY_UID = '1927969477';
export const EXPRESS_PHONE = '+244926717730';

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconImage?: any;
  color: string;
  usd: boolean;
  aoa: boolean;
  copyValue: string;
  getDetails: (t: TFunction) => string;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'binance',
    label: 'Binance Pay',
    icon: 'logo-bitcoin',
    color: '#F0B90B',
    usd: true,
    aoa: false,
    copyValue: BINANCE_ID,
    getDetails: (t) => t('planos.uid', { value: BINANCE_ID }),
  },
  {
    id: 'rodotpay',
    label: 'Rodotpay',
    icon: 'card',
    color: '#6366F1',
    usd: true,
    aoa: true,
    copyValue: RODOTPAY_UID,
    getDetails: (t) => t('planos.uid', { value: RODOTPAY_UID }),
  },
  {
    id: 'express',
    label: 'Express',
    icon: 'cash',
    color: '#00C853',
    usd: false,
    aoa: true,
    copyValue: EXPRESS_PHONE,
    getDetails: (t) => t('planos.phone', { value: EXPRESS_PHONE }),
  },
];

export interface PaidPlanInfo {
  id: Exclude<PlanId, 'free'>;
  icon: 'flash' | 'rocket' | 'trophy';
  highlight?: boolean;
  featured?: boolean;
}

export const PLANS: PaidPlanInfo[] = [
  { id: 'basic', icon: 'flash' },
  { id: 'pro', icon: 'rocket', highlight: true },
  { id: 'premium', icon: 'trophy', featured: true },
];

export const PRICES: Record<Currency, Record<PlanId, string>> = {
  usd: { free: '$0', basic: '$14.99', pro: '$29.99', premium: '$49.99' },
  aoa: { free: '0 Kz', basic: '10.000 Kz', pro: '20.000 Kz', premium: '35.000 Kz' },
};

export const PLAN_PRICES: Record<Currency, Record<Exclude<PlanId, 'free'>, number>> = {
  usd: { basic: 14.99, pro: 29.99, premium: 49.99 },
  aoa: { basic: 10000, pro: 20000, premium: 35000 },
};

export const planLabel = (plan: Exclude<PlanId, 'free'>): string =>
  plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium';
