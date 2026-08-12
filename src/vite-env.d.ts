/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_STRIPE_PRICE_USD: string;
  readonly VITE_STRIPE_PRICE_AOA: string;
  readonly VITE_BINANCE_ID: string;
  readonly VITE_BINANCE_NETWORK: string;
  readonly VITE_BINANCE_EMAIL: string;
  readonly VITE_MULTICAIXA_ENTITY: string;
  readonly VITE_MULTICAIXA_REFERENCE: string;
  readonly VITE_MULTICAIXA_IBAN: string;
  readonly VITE_PAYMENT_WHATSAPP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
