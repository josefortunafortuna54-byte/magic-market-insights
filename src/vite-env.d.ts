/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_STRIPE_PRICE_USD: string;
  readonly VITE_STRIPE_PRICE_AOA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
