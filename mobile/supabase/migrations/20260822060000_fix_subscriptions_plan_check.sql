-- ============================================================================
-- FIX: approvals de comprovativos não ativavam o plano
-- ============================================================================
-- A tabela subscriptions foi criada com CHECK (plan IN ('FREE','PREMIUM'))
-- mas o fluxo atual (recibos aprovados pelo admin) escreve os tiers da app em
-- minúsculas: free | basic | pro | premium. O upsert falhava silenciosamente
-- com violação de check constraint e nenhum utilizador ficava premium.
--
-- 1) Substituir a constraint por uma versão case-insensitive com os 4 tiers.
-- 2) Normalizar linhas existentes para minúsculas.
-- ============================================================================

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;

update public.subscriptions set plan = lower(plan) where plan <> lower(plan);

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (lower(plan) in ('free', 'basic', 'pro', 'premium'));
