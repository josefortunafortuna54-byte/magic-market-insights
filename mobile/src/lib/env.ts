function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

export const SUPABASE_URL = env('EXPO_PUBLIC_SUPABASE_URL', 'https://zwxplzdadgtiohnuotlu.supabase.co');
export const SUPABASE_ANON_KEY = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
export const ADMIN_EMAILS = env('EXPO_PUBLIC_ADMIN_EMAILS')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
export const STRIPE_PRICE_USD = env('EXPO_PUBLIC_STRIPE_PRICE_USD');
export const STRIPE_PRICE_AOA = env('EXPO_PUBLIC_STRIPE_PRICE_AOA');
export const STRIPE_PRICE_BASIC_USD = env('EXPO_PUBLIC_STRIPE_PRICE_BASIC_USD');
export const STRIPE_PRICE_BASIC_AOA = env('EXPO_PUBLIC_STRIPE_PRICE_BASIC_AOA');
export const STRIPE_PRICE_PRO_USD = env('EXPO_PUBLIC_STRIPE_PRICE_PRO_USD');
export const STRIPE_PRICE_PRO_AOA = env('EXPO_PUBLIC_STRIPE_PRICE_PRO_AOA');
export const STRIPE_PRICE_PREMIUM_USD = env('EXPO_PUBLIC_STRIPE_PRICE_PREMIUM_USD') || STRIPE_PRICE_USD;
export const STRIPE_PRICE_PREMIUM_AOA = env('EXPO_PUBLIC_STRIPE_PRICE_PREMIUM_AOA') || STRIPE_PRICE_AOA;
export const STRIPE_CHECKOUT_URL = env(
  'EXPO_PUBLIC_STRIPE_CHECKOUT_URL',
  `${SUPABASE_URL}/functions/v1/stripe-checkout`,
);
