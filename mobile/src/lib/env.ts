// Expo only inlines EXPO_PUBLIC_* variables when they are referenced with
// static dot notation (process.env.EXPO_PUBLIC_X). Dynamic access such as
// process.env[name] is left untouched and resolves to undefined in production
// bundles, which silently broke Supabase auth ("Invalid API key").
function env(value: string | undefined, fallback = ''): string {
  return value || fallback;
}

export const SUPABASE_URL = env(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  'https://zwxplzdadgtiohnuotlu.supabase.co',
);
export const SUPABASE_ANON_KEY = env(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const ADMIN_EMAILS = env(process.env.EXPO_PUBLIC_ADMIN_EMAILS)
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
export const STRIPE_PRICE_USD = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_USD);
export const STRIPE_PRICE_AOA = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_AOA);
export const STRIPE_PRICE_BASIC_USD = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_BASIC_USD);
export const STRIPE_PRICE_BASIC_AOA = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_BASIC_AOA);
export const STRIPE_PRICE_PRO_USD = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO_USD);
export const STRIPE_PRICE_PRO_AOA = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO_AOA);
export const STRIPE_PRICE_PREMIUM_USD = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_PREMIUM_USD) || STRIPE_PRICE_USD;
export const STRIPE_PRICE_PREMIUM_AOA = env(process.env.EXPO_PUBLIC_STRIPE_PRICE_PREMIUM_AOA) || STRIPE_PRICE_AOA;
export const STRIPE_CHECKOUT_URL = env(
  process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL,
  `${SUPABASE_URL}/functions/v1/stripe-checkout`,
);

export const WEB_URL = env(
  process.env.EXPO_PUBLIC_WEB_URL,
  'https://the-magic-trader.vercel.app',
).replace(/\/+$/, '');

export function webDepositUrl(plan?: string, currency?: string): string {
  const params = new URLSearchParams();
  if (plan) params.set('plan', plan);
  if (currency) params.set('currency', currency);
  const query = params.toString();
  return `${WEB_URL}/depositos${query ? `?${query}` : ''}`;
}
