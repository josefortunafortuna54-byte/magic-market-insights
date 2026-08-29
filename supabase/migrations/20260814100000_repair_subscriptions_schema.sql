-- Repara schema de public.subscriptions para bater certo com o stripe-webhook e a app
-- (a tabela ao vivo tinha um schema antigo com 'plan' em vez das colunas Stripe/status)
alter table public.subscriptions add column if not exists status text default 'inactive';
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists updated_at timestamptz default now();
