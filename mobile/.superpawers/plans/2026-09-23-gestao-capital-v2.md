# Plano — Gestão de Capital v2 (mobile)

> **Review pré-implementação** (verificação grounded no código real do repositório mobile — feito manualmente porque o subagente revisor falhou por infra; todas as âncoras foram lidas e conferidas):
>
> - [x] (PASS) Referências mortas — Corrigidas em resposta à revisão grounded: `addMovement` exige `method` e usa `notes` (não `details`) (`useMovements.ts` L8-23, L120); `submitWithdrawalRequest` recebe OBJECT e lança em erro, não devolve `{success}` (`adminApi.ts` L428-444); `useCapitalAccount` NÃO expõe `refetch` nem `meta_percent` no tipo `CapitalAccount` (`types.ts` L130-138) → Tasks 6b/6c/7a corrigidas; `BancaConfig` campos reais (`useBanca.ts` L7-18); `PAYMENT_METHODS` = Binance Pay/Rodotpay/Express com flags por moeda (`plans.ts` L27-58); `subscribeToChanges(name, listeners)` assinatura confirmada (`realtime.ts` L11); `primaryDim` existe no Palette (`theme.ts` L16/38/60); `payment_receipts.plan` existe (`20260818140000...sql` L12); `withdrawal_requests` não tem `paid_at` → migração adiciona; realtime só publicado para `capital_accounts`/`capital_reports` (`20260823080000...sql` L63-72).
> - [x] (PASS) Guarda crítica nova detectada na revisão — `handleApproveReceipt` faz `upsert` de `subscriptions` com `plan: receipt.plan`; sem guarda, um depósito `capital` sobrescreveria a subscription do utilizador. Task 2c adiciona a guarda `!== 'capital'` e a verificação 5-6.
> - [x] (PASS) Wording/consistência — plano coerente entre tasks vs spec; `paid_at` movido para a migração da Task 1 (indicado lá e no Task 3); testes usam strings/labels reais.
> - [x] (PASS) Coverage da spec — §1.1/1.2/1.3/1.4 → Tasks 1/5; §2.1→2; §2.2→8/9; §2.3→3; §2.4→4; §3→9/10; §4→7; §5→2-4; §6→11; §7→8/9; §8→tasks de teste; §9 YAGNI → nada extra; §10 → lista de aceitação final.
> - [x] (PASS) Placeholders — eliminados; únicos "confirmar" restantes são na Task 8 (ancoras de `AppInput`/métodos) agora com evidência `file:line` anexada.
> - [x] (PASS) TDD — testes mockam `react-i18next`, sub-componentes e hooks com `jest.fn()` (sem `@/core/format` real → sem `initI18n`; sem `@expo/vector-icons` real nos ecrãs).
> - [x] (PASS) Server — comandos de verificação (db push/reset, functions serve + curl) apontam para `mobile/supabase`; nunca tocar `supabase/` (raiz = web).
>
> **Veredicto**: APROVADO COM CORREÇÕES (as correções da revisão já foram aplicadas ao plano acima — listadas no item 1).

Referência: `.superpawers/specs/2026-09-23-gestao-capital-v2-design.md`
Branch: `feature/capital-management-v2` (base: `master`)
Regra de ouro: **o servidor (Supabase) é a única fonte de verdade** para `capital_accounts`, `payment_receipts` e `withdrawal_requests`. O cliente lê/pubica indicadores mas nunca muta valores de capital fora do fluxo de playbooks aprovados.

## Contexto crítico
- Dois projetos Supabase no workspace. **Este plano mexe SÓ em `mobile/supabase/`** (project_id `the-magic-trader-mobile`, URL `https://zwxplzdadgtiohnuotlu.supabase.co`). A raiz `supabase/` (web, `magic-market-insights-main`) está fora de âmbito.
- Trabalho não relacionado NÃO commitado no working tree (boom hours, fix login, `google.png`, `.temp/cli-latest`) — nunca incluir nestes commits.
- Não existe script `test` no package.json → testes correm com `npx jest`.
- `@expo/vector-icons`, `expo-*` mocks: `jest-preset-expo` + `transformIgnorePatterns` já configurados no `jest.config.js`.
- Edge function `admin-manage`: estilo `json()`/`errorJson()`, mensagens em PT, `console.error('[admin-manage] ...')` para revisão. Aprovação de receipt já é atómica (`.eq('status','pending')`).

## Definições partilhadas (usadas em todo o plano)
- Moeda normalizada: `'usd' | 'aoa'`.
- Meta default: 25 (%).
- `MIN_CAPITAL_DEPOSIT = { usd: 50, aoa: 50000 }`.
- "Crédito de capital" = **somar** `capital` e `achieved` na conta existente da moeda; criar com `capital = achieved = amount` se não existir.
- Saque aprovado/pago = **debitar** (ver Task 3).

---

## Task 1 — Migração `meta_percent` + realtime das duas tabelas

**Arquivo novo**: `mobile/supabase/migrations/20260923080000_capital_management_v2.sql`

```sql
-- meta_percent: meta publicada pela equipa (2019 default mantém 25%)
alter table public.capital_accounts
  add column if not exists meta_percent numeric(8, 2) not null default 25;

-- Realtime mínimo para o CLI ir a produção sem erro:
-- publica as tabelas que faltam e ignora se o projecto já as publica.
do $$
begin
  alter publication supabase_realtime add table public.payment_receipts;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.withdrawal_requests;
exception
  when duplicate_object then null;
end $$;

-- paid_at no mark_withdrawal_paid (transição approved → paid)
alter table public.withdrawal_requests
  add column if not exists paid_at timestamptz;
```

**Arquivo novo** (mesma migração, no fim): função de crédito idempotente e atómica, chamada pelo edge com a margem de erro já resolvida.

```sql
create or replace function public.mutation_credit_capital_account(
  p_user_id uuid,
  p_amount numeric,
  p_currency text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_currency text := lower(p_currency);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor de crédito inválido';
  end if;
  if v_currency not in ('usd', 'aoa') then
    raise exception 'Moeda inválida';
  end if;

  if exists (
    select 1 from public.capital_accounts
    where user_id = p_user_id and currency = v_currency
  ) then
    update public.capital_accounts
    set capital = capital + p_amount,
        achieved = achieved + p_amount,
        updated_at = now()
    where user_id = p_user_id and currency = v_currency;
  else
    insert into public.capital_accounts
      (user_id, plan, capital, achieved, currency, total_withdrawn, status, created_at, updated_at)
    values
      (p_user_id, 'capital', p_amount, p_amount, v_currency, 0, 'active', now(), null);
  end if;
end;
$$;
```

**Nota** — a migração contém 2 ficheiros? Não: fica tudo num único `.sql` (DDL + função). `realtime` já está publicado para `capital_accounts` e `capital_reports`.

**Verificação (TDD servidor)**:
1. `npx supabase db push` (target: `mobile` project). Sem erros.
2. `npx supabase db reset --linked` e `npx supabase db push` para garantir reexecução limpa.
3. SQL de confirmação:
   ```sql
   select column_name, column_default from information_schema.columns
   where table_name = 'capital_accounts' and column_name = 'meta_percent';
   -- esperado: numeric(8,2), default 25
   select tablename from pg_publication_tables
   where schemaname = 'public'
     and tablename in ('payment_receipts', 'withdrawal_requests');
   -- esperado: as duas linhas
   ```
4. Teste manual do RPC (consola SQL):
   ```sql
   select * from public.mutation_credit_capital_account('00000000-0000-0000-0000-000000000000', 100, 'USD');
   select * from public.capital_accounts; -- deve existir linha com capital=achieved=100
   select * from public.mutation_credit_capital_account('00000000-0000-0000-0000-000000000000', 50, 'usd');
   select * from public.capital_accounts; -- capital=achieved=150 (soma, não sobrescreve)
   ```

**Commit**: `feat(db): meta_percent e realtime de receptivos/levantamentos + rpc de crédito`
> Apenas o ficheiro de migração. Nada mais no working tree.

---

## Task 2 — `handleApproveReceipt`: crédito SOMA para capital + afiliado (server)

**Arquivo**: `mobile/supabase/functions/admin-manage/index.ts`

### 2a. Novo helper (colocar logo antes de `handleApproveReceipt`, ~L352)

```ts
/**
 * Credita capital de forma aditiva (nunca sobrescreve o saldo já publicado).
 * Best-effort: falha é logada mas nunca bloqueia a ativação do plano.
 * Usa o RPC atómico da migração para evitar o `select ... for update` local
 * (o edge role não suporta transações SQL multi-statement).
 */
async function creditCapitalAccount(
  userId: string,
  amount: number,
  currency: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('mutation_credit_capital_account', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency === 'aoa' ? 'AOA' : 'USD',
    });
    if (error) {
      console.error('[admin-manage] crédito de capital falhou', error.message);
    }
  } catch (e) {
    console.error('[admin-manage] exceção no crédito de capital', e);
  }
}
```

### 2b. Substituir o bloco de crédito do afiliado (L408-433)

De:

```ts
  // Gestão de Capital: utilizador chegado por link de afiliado que pagou o
  // Premium passa a ter o valor pago como saldo da conta de capital.
  // Best-effort: falha não deve bloquear a ativação do plano.
  if (
    receipt.user_id &&
    String(receipt.plan).toLowerCase() === 'premium' &&
    Number(receipt.amount) > 0 &&
    receipt.referral_code
  ) {
    const { error: capError } = await supabase
      .from('capital_accounts')
      .upsert(
        {
          user_id: receipt.user_id,
          currency: receipt.currency === 'aoa' ? 'aoa' : 'usd',
          capital: Number(receipt.amount),
          achieved: Number(receipt.amount),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (capError) {
      console.error('admin-manage: falha ao creditar capital do afiliado', capError.message);
    }
  }
```

Para:

```ts
  // Gestão de Capital: o valor do comprovativo é creditado de forma SOMA na
  // conta de capital da moeda do pagamento. Regras:
  //   - plan = 'capital'            → deposito de gestão (sempre credita)
  //   - plan = 'premium' + referral → afiliado: o pagamento vira capital
  // Best-effort: falha é logada, nunca bloqueia a ativação do plano.
  const plan = String(receipt.plan ?? '').toLowerCase();
  const isCapitalPlan = plan === 'capital';
  const isAffiliatePremium =
    plan === 'premium' && Boolean(receipt.referral_code);
  if (receipt.user_id && Number(receipt.amount) > 0 && (isCapitalPlan || isAffiliatePremium)) {
    await creditCapitalAccount(
      receipt.user_id,
      Number(receipt.amount),
      String(receipt.currency ?? 'usd'),
    );
  }
```

### 2c. Guarda CRÍTICA — subscription não pode ser apagada por depósito capital

O bloco "Upsert subscription" (L383-406) faz `upsert` de `subscriptions` com `plan: String(receipt.plan)`. Sem guarda, aprovar um depósito `capital` sobrescrevia a subscription do utilizador para `plan='capital'`. Alterar a condição do bloco:

De:
```ts
  // Upsert subscription — falha já NÃO é silenciosa: sem isto o plano nunca muda
  if (receipt.user_id && receipt.plan) {
    const planName = String(receipt.plan).toLowerCase();
```
Para:
```ts
  // Upsert subscription — falha já NÃO é silenciosa: sem isto o plano nunca muda.
  // Guarda CRÍTICA: 'capital' é um depósito de gestão, NÃO uma compra de plano —
  // nunca sobrescrever a subscription do utilizador.
  if (receipt.user_id && receipt.plan && String(receipt.plan).toLowerCase() !== 'capital') {
```

**Verificação extra** (no validate da Task 2):
5. Aprovar um comprovativo `plan='capital'` de um utilizador com `subscriptions.plan='premium'` → a subscription **continua 'premium'**; `capital_accounts` credita.
6. Aprovar `plan='premium'` sem referral → subscription ativa, NÃO credita capital.

**Verificação**: `npx supabase functions serve` (com `--env-file`) + chamada simulada de aprovação com token admin:
```bash
curl -X POST localhost:54321/functions/v1/admin-manage \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve_receipt","id":"<id-comprovativo-capital-pending>"}'
# Esperado: {"approved":true}; na BD, capital_accounts soma o amount (moeda igual),
# se não houver conta da moeda → nova linha com capital=achieved=amount.
```
Repetir para um comprovativo `premium` com `referral_code` preenchido → soma, não sobrescreve. Confirmar também que aprovação dupla devolve `alreadyProcessed:true` sem crédito duplo.

**Commit**: `feat(server): credito de capital aditivo e plano capital no approve_receipt`

---

## Task 3 — `mark_withdrawal_paid`: débito idempotente (server)

**Arquivo**: `mobile/supabase/functions/admin-manage/index.ts`, case `mark_withdrawal_paid` (L1032-1042).

Pretende-se substituir por versão que (1) só faz transição `approved → paid`; (2) debita da conta de capital da moeda do pedido (best-effort, logada); (3) nunca debita se o pedido já estiver `paid`/`rejected`.

Substituir por:

```ts
    case 'mark_withdrawal_paid': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');

      // Transição atómica: approved → paid. Sem .eq('status') o update era
      // idempotente na BD mas não gravava a transição correta nem evitava
      // pagamentos duplos a partir de estados inválidos.
      const { data: transitioned, error: updateErr } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'paid',
          reviewed_by: user.id,
          paid_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'approved')
        .select('user_id, amount, currency')
        .maybeSingle();

      if (updateErr) return errorJson(updateErr.message, 500);
      if (!transitioned) {
        return errorJson('Levantamento não está aprovado ou já foi pago.', 409);
      }

      // Debito do saldo publicado (best-effort, logado)
      const currency = transitioned.currency === 'aoa' ? 'aoa' : 'usd';
      const { data: account, error: acctErr } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', transitioned.user_id)
        .eq('currency', currency)
        .maybeSingle();

      if (!acctErr && account) {
        const { error: debitErr } = await supabase
          .from('capital_accounts')
          .update({
            achieved: Math.max(0, Number(account.achieved ?? 0) - Number(transitioned.amount)),
            total_withdrawn: (Number(account.total_withdrawn ?? 0) + Number(transitioned.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
        if (debitErr) {
          console.error('[admin-manage] débito de levantamento falhou', debitErr.message);
        }
      }

      return json({ ok: true });
    }
```

**Nota**: `paid_at` já é criado na migração da Task 1 (coluna `paid_at timestamptz` em `withdrawal_requests`).

**Verificação**:
1. Criar pedido `approved` para um user com conta USD; chamar `mark_withdrawal_paid` → 200; DD: `achieved` debitado, `total_withdrawn` aumentado.
2. Chamar de novo o mesmo id → 409 `Levantamento não está aprovado ou já foi pago.`; sem débito duplo.
3. Pedido `pending`/`rejected` → 409.
4. Pedido de moeda sem conta → `ok:true`, sem débito, log com erro (best-effort mantém pagamento aprovado).

**Commit**: `feat(server): mark_withdrawal_paid com transição atomica e debito de capital`

---

## Task 4 — `upsert_capital_account`: aceitar `meta_percent` (server)

**Arquivo**: `mobile/supabase/functions/admin-manage/index.ts`, case `upsert_capital_account` (L823-839).

De:
```ts
    case 'upsert_capital_account': {
      const { user_id, capital, achieved, currency, total_withdrawn } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const row: Record<string, unknown> = { user_id: String(user_id), updated_at: new Date().toISOString() };
      if (capital != null) row.capital = Number(capital);
      if (achieved != null) row.achieved = Number(achieved);
      if (total_withdrawn != null) row.total_withdrawn = Number(total_withdrawn);
      if (currency === 'usd' || currency === 'aoa') row.currency = currency;
```

Para:
```ts
    case 'upsert_capital_account': {
      const { user_id, capital, achieved, currency, total_withdrawn, meta_percent } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const row: Record<string, unknown> = { user_id: String(user_id), updated_at: new Date().toISOString() };
      if (capital != null) row.capital = Number(capital);
      if (achieved != null) row.achieved = Number(achieved);
      if (total_withdrawn != null) row.total_withdrawn = Number(total_withdrawn);
      if (currency === 'usd' || currency === 'aoa') row.currency = currency;
      if (meta_percent != null) {
        const mp = Number(meta_percent);
        if (mp >= 0 && mp <= 100) row.meta_percent = mp;
      }
```

**Verificação**: chamada `upsert_capital_account` com `meta_percent: 30` → resposta contém `meta_percent: 30`; chamada sem `meta_percent` não altera o valor existente; `meta_percent: 150` é ignorado (mantém anterior).

**Commit**: `feat(server): meta_percent no upsert_capital_account`

---

## Task 5 — `src/core/capital.ts` + testes (TDD)

Arquivo novo `mobile/src/core/capital.ts` — funções puras testáveis (a UI é fina; toda a lógica de percentagens aqui).

```ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function profit(achieved: number, capital: number): number {
  return achieved - capital;
}

export function profitPct(achieved: number, capital: number): number {
  if (!isFinite(achieved) || !isFinite(capital)) return 0;
  if (capital <= 0) return 0;
  return (profit(achieved, capital) / capital) * 100;
}

/** Progresso até à meta em % (0..100). Meta usa capital x metaPercent/100. */
export function progressPct(achieved: number, capital: number, metaPercent: number): number {
  const target = (capital * metaPercent) / 100;
  if (target <= 0) return 0;
  const p = (profit(achieved, capital) / target) * 100;
  return isFinite(p) ? clamp(p, 0, 100) : 100;
}

/** Montante que pode ser pedido em saque: nunca negativo. */
export function withdrawable(achieved: number): number {
  if (!isFinite(achieved)) return 0;
  return Math.max(0, achieved);
}
```

Teste `mobile/src/core/__tests__/capital.test.ts` (novo):

```ts
import { clamp, profit, profitPct, progressPct, withdrawable } from '../capital';

describe('capital helpers', () => {
  it('profit: saldo menos investido', () => {
    expect(profit(1200, 1000)).toBe(200);
    expect(profit(900, 1000)).toBe(-100);
  });

  it('profitPct: % relativa e 0 quando capital é 0', () => {
    expect(profitPct(1200, 1000)).toBeCloseTo(20);
    expect(profitPct(900, 1000)).toBeCloseTo(-10);
    expect(profitPct(100, 0)).toBe(0);
    expect(profitPct(NaN, 1000)).toBe(0);
  });

  it('progressPct: clamp 0..100, target 0 → 0', () => {
    expect(progressPct(1250, 1000, 25)).toBe(100);
    expect(progressPct(1050, 1000, 25)).toBeCloseTo(20);
    expect(progressPct(950, 1000, 25)).toBe(0);
    expect(progressPct(1200, 0, 25)).toBe(0);
  });

  it('withdrawable: nunca devolve negativo', () => {
    expect(withdrawable(500)).toBe(500);
    expect(withdrawable(-50)).toBe(0);
    expect(withdrawable(NaN)).toBe(0);
  });

  it('clamp: limita entre min e max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});
```

**Fluxo TDD**: escrever o teste → ver falhar (`npx jest src/core` não deve encontrar ficheiro) → escrever `capital.ts` → `npx jest src/core/__tests__/capital.test.ts` passa.

**Commit**: `feat(core): helpers de capital puros + testes`

---

## Task 6 — Tipos, `MIN_CAPITAL_DEPOSIT` e `meta_percent` na adminApi

### 6a. `mobile/src/lib/plans.ts` — constante

Após as constantes de planos (junto das restantes):

```ts
/** Depósito mínimo de gestão de capital por moeda. */
export const MIN_CAPITAL_DEPOSIT: Record<Currency, number> = { usd: 50, aoa: 50000 };
```

### 6b. `mobile/src/lib/adminApi.ts`

- `submitWithdrawalRequest(req: { method, amount, currency, details? }): Promise<void>` já existe e **lança erro** em falha (verificação acima já feita). Sem alteração de assinatura.
- `upsertCapitalAccount(data: { user_id, capital?, achieved?, total_withdrawn?, currency? })` → adicionar campo `meta_percent?: number`:
  ```ts
  export async function upsertCapitalAccount(data: {
    user_id: string;
    capital?: number;
    achieved?: number;
    total_withdrawn?: number;
    currency?: 'usd' | 'aoa';
    meta_percent?: number;
  }): Promise<void> {
    const payload = { ...data };
    if (payload.meta_percent == null) delete payload.meta_percent;
    await callAdminFn('upsert_capital_account', payload);
  }
  ```
- Nota: `capital_accounts` só é mutado pelo admin-manage; o cliente apenas publica `payment_receipts` e `withdrawal_requests`.

### 6c. `mobile/src/core/types.ts` — `CapitalAccount`

A interface atual NÃO tem `meta_percent` (L130-138). Adicionar o campo opcional:

```ts
export interface CapitalAccount {
  user_id: string;
  currency: 'usd' | 'aoa';
  capital: number;
  achieved: number;
  total_withdrawn: number;
  status: string;
  meta_percent?: number;
  updated_at?: string;
}
```

**Verificação**: `npx tsc --noEmit` sem novos erros.

---

## Task 7 — Hooks: `useCapitalAccount` c/ meta normalizada + `useCapitalDeposits` + `useWithdrawals`

### 7a. `useCapitalAccount` (editar retorno)

O retorno atual é `{ account, reports, loading }` sem `refetch`. Adicionar `metaPercent` normalizado (e `DEFAULT_META_PERCENT` junto ao hook):

```ts
export const DEFAULT_META_PERCENT = 25;
```

```ts
  return {
    account: accountQuery.data ?? null,
    reports: reportsQuery.data ?? [],
    loading: accountQuery.isLoading || reportsQuery.isLoading,
    metaPercent: accountQuery.data?.meta_percent ?? DEFAULT_META_PERCENT,
  };
```

Não expor `refetch` (ninguém usa; o realtime já invalida a query).
Quadro de decisão do `metaPercent` para a UI:
- conta existe + `meta_percent` preenchido → valor do servidor (0-100);
- conta existe sem `meta_percent` (coluna nova, null na BD) → `25` fallback;
- sem conta + `config.metaPercent` local → valor local (planner offline).

### 7b. Novo `mobile/src/hooks/useCapitalDeposits.ts`

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';

export interface CapitalDeposit {
  id: string;
  user_id: string;
  plan: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

async function fetchCapitalDeposits(userId: string): Promise<CapitalDeposit[]> {
  const { data, error } = await supabase
    .from('payment_receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('plan', 'capital')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as CapitalDeposit[];
}

/** Histórico de depósitos de gestão de capital (payments da moeda da conta). */
export function useCapitalDeposits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id);

  const query = useQuery<CapitalDeposit[], Error>({
    queryKey: ['capital-deposits', user?.id],
    queryFn: () => fetchCapitalDeposits(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('payment_receipts', [
      {
        table: 'payment_receipts',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-deposits', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return { deposits: query.data ?? [], loading: query.isLoading, refetch: query.refetch };
}
```

### 7c. Novo `mobile/src/hooks/useWithdrawals.ts`

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';

export interface WithdrawalItem {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes: string | null;
  created_at: string;
}

async function fetchWithdrawals(userId: string): Promise<WithdrawalItem[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as WithdrawalItem[];
}

/** Levantamentos do utilizador com atualização em tempo real (RLS: wr_select_own). */
export function useWithdrawals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id);

  const query = useQuery<WithdrawalItem[], Error>({
    queryKey: ['capital-withdrawals', user?.id],
    queryFn: () => fetchWithdrawals(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('withdrawal_requests', [
      {
        table: 'withdrawal_requests',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-withdrawals', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return { withdrawals: query.data ?? [], loading: query.isLoading, refetch: query.refetch };
}
```

**Verificação**: `npx tsc --noEmit`. Confirmar que `subscribeToChanges(table, [{ table, filter, onEvent }])` aceita assinatura semelhante ao `useCapitalAccount` (ver ficheiro real antes de copiar filtros). Baseline: `npx jest` (6 suites / 56 testes) continua verde.

**Commit**: `feat(hooks): useCapitalDeposits e useWithdrawals + metaPercent normalizado`

---

## Task 8 — `WithdrawalModal` + testes (TDD)

Arquivo novo `mobile/src/components/WithdrawalModal.tsx`. Reutiliza `ui` (AppButton/AppText/AppInput), `Modal`, `PAYMENT_METHODS` (métodos filtrados por moeda), `useMovements.addMovement` e `submitWithdrawalRequest`.

```tsx
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMovements } from '@/hooks/useMovements';
import { PAYMENT_METHODS, type Currency, type PaymentMethod } from '@/lib/plans';
import { submitWithdrawalRequest } from '@/lib/adminApi';

interface WithdrawalModalProps {
  visible: boolean;
  available: number;
  currency: Currency;
  onClose: () => void;
}

export function WithdrawalModal({ visible, available, currency, onClose }: WithdrawalModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { addMovement } = useMovements();

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const methods = PAYMENT_METHODS.filter((m) => m[currency]);
  const amountNum = Number(amount);
  const isAoa = currency === 'aoa';
  const valid = Boolean(method) && amountNum > 0 && amountNum <= available &&
    (!isAoa || details.trim().length > 0);

  const selectedMethod = method ? methods.find((m) => m.id === method) : null;

  const submit = async () => {
    if (!valid || busy || !method) return;
    setBusy(true);
    try {
      await submitWithdrawalRequest({
        method,
        amount: amountNum,
        currency,
        details: isAoa ? details.trim() : undefined,
      });
      addMovement({
        type: 'withdrawal',
        method,
        amount: amountNum,
        currency,
        status: 'pendente',
        notes: isAoa ? details.trim() : selectedMethod?.label,
      });
      setAmount('');
      setDetails('');
      setMethod(null);
      onClose();
    } catch {
      Alert.alert(t('capital.withdrawErrorTitle'), t('capital.withdrawErrorMsg'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText variant="h2">{t('capital.withdrawalTitle')}</AppText>
            <Pressable onPress={onClose} hitSlop={8} disabled={busy}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <AppText variant="muted">
              {t('capital.withdrawableValue', { value: formatWithdrawable(available, currency) })}
            </AppText>

            {!method ? (
              <View style={styles.methodGrid}>
                {methods.map((m) => (
                  <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.methodCard, { borderColor: m.color, borderWidth: 2 }]}>
                    <View style={[styles.methodIcon, { backgroundColor: `${m.color}1A` }]}>
                      <Ionicons name={m.icon} size={24} color={m.color} />
                    </View>
                    <AppText variant="label" style={{ color: m.color }}>{m.label}</AppText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.selectedRow}>
                  <View style={[styles.methodIcon, { backgroundColor: `${selectedMethod?.color}1A` }]}>
                    <Ionicons name={selectedMethod?.icon ?? 'card'} size={20} color={selectedMethod?.color} />
                  </View>
                  <View style={styles.selectedInfo}>
                    <AppText variant="label" style={{ color: selectedMethod?.color }}>{selectedMethod?.label}</AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>{selectedMethod?.getDetails(t)}</AppText>
                  </View>
                  <Pressable onPress={() => setMethod(null)} disabled={busy}>
                    <AppText variant="small" style={{ color: colors.primary }}>{t('planos.change')}</AppText>
                  </Pressable>
                </View>

                <AppInput
                  label={t('capital.withdrawAmount')}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                />
                {isAoa ? (
                  <AppInput
                    label={t('capital.withdrawDetails')}
                    placeholder="NIF / IBAN"
                    value={details}
                    onChangeText={setDetails}
                  />
                ) : null}
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {selectedMethod?.copyValue}
                </AppText>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <AppButton title={t('planos.cancel')} variant="ghost" onPress={onClose} disabled={busy} />
            <AppButton
              title={t('capital.requestWithdrawal')}
              variant="primary"
              onPress={submit}
              loading={busy}
              disabled={!valid}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatWithdrawable(n: number, currency: Currency): string {
  if (currency === 'aoa') return `${Math.round(n).toLocaleString('pt-PT')} Kz`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
    content: { backgroundColor: c.surface, borderRadius: 20, padding: Spacing.lg, gap: Spacing.md, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingBottom: Spacing.md },
    body: { gap: Spacing.md },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    methodCard: { flex: 1, minWidth: 100, maxWidth: 130, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: 16, backgroundColor: c.surface, padding: Spacing.md },
    methodIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    selectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: c.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    selectedInfo: { flex: 1, gap: 2 },
    actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  });
```

**Ancoras já verificadas (não re-verificar)**:
- `useMovements().addMovement(movement: Omit<WalletMovement,'id'|'createdAt'>)` — **exige `method: PaymentMethod`**; `notes` é o campo de texto (não existe `details` em `WalletMovement`). `status` aceita 'pendente'|'concluido'|'recusado' (ver `useMovements.ts` L8-23, L120).
- `submitWithdrawalRequest({ method, amount, currency, details? }): Promise<void>` — recebe objeto e **lança** em erro (ver `adminApi.ts` L428-444).
- `PAYMENT_METHODS` tem flags `usd`/`aoa` — filtrar por moeda: `binance` só usd, `express` só aoa, `rodotpay` ambos (ver `plans.ts` L27-58).
- `AppInput` estende `TextInputProps` → `onChangeText`/`placeholder`/`keyboardType` válidos (ver `ui.tsx` L255-277).

Teste `mobile/src/components/__tests__/WithdrawalModal.test.tsx` (novo):

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { WithdrawalModal } from '../WithdrawalModal';
import { submitWithdrawalRequest } from '@/lib/adminApi';
import { useMovements } from '@/hooks/useMovements';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
}));

jest.mock('@/lib/adminApi', () => ({ submitWithdrawalRequest: jest.fn() }));
jest.mock('@/hooks/useMovements', () => ({
  useMovements: jest.fn(() => ({ addMovement: jest.fn() })),
}));

const mockedSubmit = submitWithdrawalRequest as jest.Mock;
const mockedAdd = (useMovements as jest.Mock)().addMovement as jest.Mock;

const renderModal = (props: Partial<Parameters<typeof WithdrawalModal>[0]>) =>
  render(<WithdrawalModal visible currency="usd" available={200} onClose={jest.fn()} {...props} />);

describe('WithdrawalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubmit.mockResolvedValue(undefined);
  });

  it('bloqueia sem método e sem montante', () => {
    const submitBtn = renderModal({}).getByText('capital.requestWithdrawal').parent!;
    expect(submitBtn.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('ativa com método e montante válidos', () => {
    const { getByText, getByPlaceholderText, queryAllByText } = renderModal({});
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    expect(queryAllByText('capital.requestWithdrawal')[0].parent!.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('não permite montante acima do disponível', () => {
    const { getByText, getByPlaceholderText, queryAllByText } = renderModal({ available: 50 });
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    expect(queryAllByText('capital.requestWithdrawal')[0].parent!.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('submete e regista movimento de saque com método/notes', async () => {
    const { getByText, getByPlaceholderText } = renderModal({});
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    fireEvent.press(getByText('capital.requestWithdrawal'));
    expect(mockedSubmit).toHaveBeenCalledWith({ method: 'rodotpay', amount: 100, currency: 'usd', details: undefined });
    expect(mockedAdd).toHaveBeenCalledWith(expect.objectContaining({
      type: 'withdrawal', method: 'rodotpay', amount: 100, currency: 'usd', status: 'pendente',
    }));
  });
});
```

**Notas**:
- Métodos visíveis para `usd` (mock do modal): `Binance Pay` e `Rodotpay` (o `express` é aoa-only). Strings do teste usam `Rodotpay` (existe de facto em `plans.ts`).
- O `__tests__` da pasta de components segue o padrão de `UserDetailModal.test.tsx` (mock de `react-i18next` + Alert spy) — sem `@/core/format` importado, logo sem init real do i18n.
- `getByPlaceholderText('0.00')` único (placeholder do modal).

Fluxo TDD: teste → falha (componente não existe) → componente → passa.

**Commit**: `feat(modal): WithdrawalModal com validacao e registo local + testes`

---

## Task 9 — `banca.tsx` redesign (item 3 da spec) + teste (TDD)

**Edição**: substituir `mobile/src/app/banca.tsx` na íntegra por:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { WithdrawalModal } from '@/components/WithdrawalModal';
import { GrowthPlanSection } from '@/components/GrowthPlanSection';
import { CapitalSimulatorCard } from '@/components/CapitalSimulatorCard';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { profit, profitPct, progressPct, withdrawable } from '@/core/capital';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';
import { useCapitalDeposits } from '@/hooks/useCapitalDeposits';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { PAYMENT_METHODS, MIN_CAPITAL_DEPOSIT } from '@/lib/plans';

function StatusPill({ label, color }: { label: string; color: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <AppText variant="small" style={{ color, fontWeight: '600' }}>{label}</AppText>
    </View>
  );
}

export default function BancaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { canAccessBanca, loading: subLoading } = useSubscription();
  const { config, loading } = useBanca();
  const { account, reports, metaPercent } = useCapitalAccount();
  const { deposits } = useCapitalDeposits();
  const { withdrawals } = useWithdrawals();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (!subLoading && !canAccessBanca) {
    return (
      <Screen>
        <PremiumLock label={t('capital.lockTitle')} description={t('capital.lockDesc')} />
      </Screen>
    );
  }

  if (loading || subLoading) return <Screen><AppText variant="muted">{t('capital.loading')}</AppText></Screen>;

  const capital = account?.capital ?? config.capital;
  const current = account?.achieved ?? config.achieved;
  const cur = account?.currency ?? config.currency ?? 'usd';
  const totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn;
  const latestReport = reports[0] ?? null;

  const p = profit(current, capital);
  const pPct = profitPct(current, capital);
  const isProfit = p >= 0;
  const targetPct = metaPercent;
  const targetValue = capital * (targetPct / 100);
  const progress = progressPct(current, capital, targetPct);

  // Depósitos de gestão aprovados na moeda da conta (fonte da verdade do server)
  const depositsNum = deposits
    .filter((d) => d.status === 'approved' && d.currency === cur)
    .reduce((s, d) => s + Number(d.amount), 0);
  const hasDeposits = depositsNum >= MIN_CAPITAL_DEPOSIT[cur];

  // histórias combinadas: reports de lucro + saques (mais recentes primeiro)
  const history = [
    ...(latestReport
      ? [{ key: `report-${latestReport.id}`, kind: 'report' as const, label: t('capital.latestReport'), amount: latestReport.profit, date: latestReport.period_end }]
      : []),
    ...withdrawals.map((w) => ({
      key: `w-${w.id}`,
      kind: w.status === 'paid' ? 'withdraw-paid' as const : 'withdraw' as const,
      label: formatWithdrawMethod(w.method),
      amount: -Number(w.amount),
      date: w.created_at,
      status: w.status as string,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Estado binário: gestão ativa (conta publicada ou capital registado)
  const hasManagement = Boolean(account) || capital > 0 || current > 0;

  if (!hasManagement) {
    return (
      <Screen>
        <SectionTitle>{t('capital.title')}</SectionTitle>
        <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
          {t('capital.subtitle')}
        </AppText>

        <GradientCard colors={[`${colors.accent}26`, `${colors.primary}12`]} style={styles.hero}>
          <AppText variant="small" style={[styles.heroEyebrow, { color: colors.accent }]}>
            {t('capital.inactiveEyebrow')}
          </AppText>
          <AppText variant="mono" style={styles.heroValue}>+{targetPct}%</AppText>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {t('capital.inactiveHeroDesc')}
          </AppText>
          <View style={styles.heroFooter}>
            <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {t('capital.minDeposit')}: {formatMinDeposit(cur)}
            </AppText>
            <StatusPill label={t('capital.inactiveBadge')} color={colors.warning} />
          </View>
        </GradientCard>

        <Card style={styles.card}>
          <View style={styles.cardHeader}><AppText variant="label">{t('capital.howItWorks')}</AppText></View>
          {[
            { icon: 'wallet', color: colors.success, title: t('capital.step1Title'), desc: t('capital.step1Desc') },
            { icon: 'trending-up', color: colors.accent, title: t('capital.step2Title'), desc: t('capital.step2Desc') },
            { icon: 'cash', color: colors.warning, title: t('capital.step3Title'), desc: t('capital.step3Desc') },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: `${step.color}18` }]}>
                <Ionicons name={step.icon as any} size={18} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{step.title}</AppText>
                <AppText variant="small" style={{ color: colors.textMuted }}>{step.desc}</AppText>
              </View>
            </View>
          ))}
        </Card>

        <CapitalSimulatorCard
          capital={0}
          currency="usd"
          strategy={config.planId}
          onDeposit={(amount) =>
            router.push({
              pathname: '/depositos',
              params: { amount: String(Math.round(amount * 100) / 100), currency: 'usd' },
            })
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle>{t('capital.title')}</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        {t('capital.subtitle')}
      </AppText>

      <GradientCard colors={[colors.primaryDim, 'rgba(22,164,58,0.15)']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" style={styles.heroEyebrow}>{t('capital.currentBalance')}</AppText>
          </View>
          <StatusPill label={t('capital.active')} color={colors.success} />
        </View>
        <AppText variant="mono" style={[styles.heroValue, { color: isProfit ? colors.text : colors.destructive }]}>
          {formatBancaMoney(current, cur)}
        </AppText>
        <View style={styles.heroFooter}>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('capital.deposited')}{formatBancaMoney(capital, cur)}
          </AppText>
          <AppText variant="small" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : ''}{formatBancaMoney(p, cur)} ({pPct > 0 ? '+' : ''}{pPct.toFixed(1)}%)
          </AppText>
        </View>
      </GradientCard>

      {latestReport ? (
        <Pressable onPress={() => router.push('/diario-trader')}>
          <Card style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <View style={styles.reportTitleRow}>
                <Ionicons name="document-text" size={15} color={colors.accent} />
                <AppText variant="label">{t('capital.latestReport')}</AppText>
              </View>
              <Badge color={latestReport.profit >= 0 ? colors.success : colors.destructive}
                bg={latestReport.profit >= 0 ? `${colors.success}20` : `${colors.destructive}20`}>
                {`${latestReport.profit >= 0 ? '+' : ''}${latestReport.profit_pct.toFixed(1)}%`}
              </Badge>
            </View>
            <View style={styles.reportRow}>
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {formatShortDate(latestReport.period_start)} – {formatShortDate(latestReport.period_end)}
              </AppText>
              <AppText variant="label" style={{ color: latestReport.profit >= 0 ? colors.success : colors.destructive }}>
                {`${latestReport.profit >= 0 ? '+' : ''}${formatBancaMoney(latestReport.profit, cur)}`}
              </AppText>
            </View>
            {latestReport.note ? (
              <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={2}>
                {latestReport.note}
              </AppText>
            ) : null}
          </Card>
        </Pressable>
      ) : null}

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet" size={18} color={colors.text} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.invested')}</AppText>
          <AppText variant="label">{formatBancaMoney(capital, cur)}</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="trending-up" size={18} color={colors.success} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.profit')}</AppText>
          <AppText variant="label" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : ''}{formatBancaMoney(p, cur)}
          </AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="flag" size={18} color={colors.accent} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.target')}</AppText>
          <AppText variant="label" style={{ color: colors.accent }}>+{targetPct}%</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="cash" size={18} color={colors.warning} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.withdrawn')}</AppText>
          <AppText variant="label" style={{ color: colors.warning }}>{formatBancaMoney(totalWithdrawn, cur)}</AppText>
        </Card>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.progressTitle')}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>{Math.round(progress)}%</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            +{formatBancaMoney(p, cur)}
          </AppText>
          <AppText variant="small" style={{ color: colors.accent }}>
            {t('capital.targetValue', { value: formatBancaMoney(targetValue, cur) })}
          </AppText>
        </View>
      </Card>

      <CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId} />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.withdrawalTitle')}</AppText>
          <Badge color={colors.success} bg={`${colors.success}20`}>{t('capital.weekly')}</Badge>
        </View>
        <AppText variant="muted" style={{ marginBottom: Spacing.sm }}>
          {t('capital.withdrawalDesc')}
        </AppText>
        <AppButton
          title={t('capital.requestWithdrawal')}
          variant="secondary"
          icon={<Ionicons name="cash-outline" size={18} color={colors.accent} />}
          onPress={() => setWithdrawOpen(true)}
          disabled={!hasDeposits}
        />
      </Card>

      <GrowthPlanSection capital={capital} currency={cur} />

      <WithdrawalModal
        visible={withdrawOpen}
        available={withdrawable(current)}
        currency={cur}
        onClose={() => setWithdrawOpen(false)}
      />
    </Screen>
  );
}

function formatMinDeposit(currency: 'usd' | 'aoa'): string {
  const v = MIN_CAPITAL_DEPOSIT[currency];
  return currency === 'aoa' ? `${v.toLocaleString('pt-PT')} Kz` : `$${v}`;
}

function formatWithdrawMethod(method: string): string {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method;
}
```

**Importantes** (não esquecer):
- `formatWithdrawMethod` usa o `label` real de `PAYMENT_METHODS` (`binance` → 'Binance Pay', `rodotpay` → 'Rodotpay', `express` → 'Express').
- `disabled={!hasDeposits}`: saque exige um depósito de gestão aprovado (≥ min) naquela moeda — evita saldos vindos só do capital afiliado sem ativação real.
- `useCapitalAccount` devolve `metaPercent` (Task 7a) — sem conta, fallback 25; o ecrã inativo usa `+{targetPct}%` em vez do hardcoded `+25%`.

Teste `mobile/src/app/__tests__/banca.test.tsx` (novo). Mocks (evitam i18n real e sub-componentes pesados):

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import BancaScreen from '../banca';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ canAccessBanca: true, loading: false }) }));
jest.mock('@/hooks/useBanca', () => ({
  useBanca: jest.fn(() => ({
    config: { capital: 0, achieved: 0, metaPercent: 25, planId: 'conservador', totalWithdrawn: 0, currency: 'usd' },
    loading: false,
    save: jest.fn(),
  })),
}));
jest.mock('@/hooks/useCapitalAccount', () => ({
  useCapitalAccount: jest.fn(() => ({
    account: { id: 'a1', capital: 1000, achieved: 1250, currency: 'usd', total_withdrawn: 0, status: 'active', meta_percent: 25 },
    reports: [],
    loading: false,
    metaPercent: 25,
  })),
}));
jest.mock('@/hooks/useCapitalDeposits', () => ({
  useCapitalDeposits: jest.fn(() => ({
    deposits: [{ id: 'd1', plan: 'capital', amount: 1000, currency: 'usd', status: 'approved' }],
    loading: false,
  })),
}));
jest.mock('@/hooks/useWithdrawals', () => ({
  useWithdrawals: jest.fn(() => ({ withdrawals: [], loading: false })),
}));
jest.mock('@/core/format', () => ({
  formatBancaMoney: (n: number) => `$${n.toFixed(2)}`,
  formatShortDate: (s: string) => s,
}));
jest.mock('@/components/CapitalSimulatorCard', () => () => null);
jest.mock('@/components/GrowthPlanSection', () => () => null);
jest.mock('@/components/GradientCard', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('@/components/PremiumLock', () => () => null);
jest.mock('@/components/WithdrawalModal', () => ({ WithdrawalModal: jest.fn(() => null) }));

describe('BancaScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra saldo atual, lucro e meta (estado ativo)', () => {
    const { getByText } = render(<BancaScreen />);
    expect(getByText('$1250.00')).toBeTruthy();
    expect(getByText('+$250.00 (25.0%)')).toBeTruthy();
    expect(getByText('+25%')).toBeTruthy();
  });

  it('mostra hero inativo quando não há conta nem capital', () => {
    (useCapitalAccount as jest.Mock).mockReturnValue({
      account: null, reports: [], loading: false, metaPercent: 25,
    });
    const { getByText } = render(<BancaScreen />);
    expect(getByText('capital.minDeposit')).toBeTruthy();
  });

  it('abre o modal de levantamento ao carregar no botão (depósito >= min)', () => {
    const { getByText } = render(<BancaScreen />);
    fireEvent.press(getByText('capital.requestWithdrawal'));
    expect(require('@/components/WithdrawalModal').WithdrawalModal).toHaveBeenCalled();
  });
});
```

**Notas**:
- `useBanca` mock usa só campos reais de `BancaConfig` (`useBanca.ts` L7-18: `capital, achieved, metaPercent, planId, totalWithdrawn, currency?`).
- O mock de `banca.tsx` importa o named export `WithdrawalModal` → factory com `{ WithdrawalModal: jest.fn(...) }`. No caso ativo, o botão de saque fica habilitado porque `deposits` tem `approved >= $50` (MIN_CAPITAL_DEPOSIT.usd).
- A linha de lucro renderizada é `+{formatBancaMoney(250)} ({pPct.toFixed(1)}%)` = `+$250.00 (25.0%)` com o mock de format.
- `GradientCard` mockado (ignora LinearGradient); `useCapitalScreen` NÃO importa `@/core/format` real → sem `initI18n` no teste.

**Commit**: `feat(banca): redesign com meta do servidor, deposit minimo e levantamento real`

---

## Task 10 — `depositos.tsx`: hero usa conta do servidor + mínimo por moeda

**Arquivo**: `mobile/src/app/depositos.tsx` (ler primeiro; ancoras reais: `useBanca` L55, estado `withdrawMethod` L95, submit L258-280, metodo-gride de saque L492+, placeholder L524).

Mudanças mínimas (não tocar no fluxo de levantamento legacy — já usa `submitWithdrawalRequest({ method, amount, currency, details })` correto, L264):
1. No hero da Gestão de Capital (~L385-400): quando `useCapitalAccount()` devolver `account`, usar `account.currency` / `account.achieved` / `account.capital` em vez de `banca.*`; fallback local quando `account == null`.
2. Substituir o literal `$50` do texto de depósito mínimo por `formatMinDeposit` com `MIN_CAPITAL_DEPOSIT[cur]` (mesmo helper formatador da Task 9 — extraí-lo para `src/core/capital.ts` como `formatMinDepositCore(currency)` e reutilizar em banca.tsx).
3. Se o hero mostrar percentagem de lucro, usar `profit/profitPct` de `@/core/capital` (Task 5) — mantém os mesmos números, só muda a fonte.

**Verificação**: `npx tsc --noEmit` + `npx jest` verde (nenhum teste existente quebra — `depositos.tsx` não tem teste dedicado).

**Commit**: `feat(depositos): hero usa conta de capital do servidor e minimos por moeda`

---

## Task 11 — i18n (`pt.json` + `en.json`)

Adicionar apenas em `mobile/src/lib/i18n/locales/pt.json` e `en.json`, sob a chave `capital`, as keys novas usadas:

References literais (procurar por exact nas tasks 8-10):
- `capital.withdrawableValue` ("Disponível: {value}" / "Available: {value}")
- `capital.withdrawAmount` ("Montante do saque" / "Withdrawal amount")
- `capital.withdrawDetails` ("NIF / IBAN do destinatário" / "Recipient NIF/IBAN")
- `capital.targetValue` ("Meta: +{value}" / "Target: +{value}")
- `capital.withdrawErrorTitle` ("Falha no levantamento" / "Withdrawal failed")
- `capital.withdrawErrorMsg` ("Não foi possível submeter o pedido. Tenta novamente." / "Could not submit the request. Please try again.")
- `capital.minDeposit` já existe ✅ (pt.json L668 / en.json L664)
- `capital.withdrawalTitle`, `capital.requestWithdrawal`, `capital.withdrawalDesc`, `capital.weekly` já existem ✅

**Nota**: `fallbackLng: 'pt'` garante cobertura nos restantes 12 locales, mas as keys novas vão apenas em `pt.json` + `en.json`. Não criar duplicates; procurar antes por `withdrawErrorTitle` (pode existir noutro namespace).

**Verificação**: `npx tsc --noEmit`; teste manual: abrir Banca/Depositos em pt e en.

**Commit**: `feat(i18n): keys de capital v2 (pt/en)`

---

## Task 12 — Verificação final e commit de fecho

1. `npx jest` → todas as suites (incl. os 3 ficheiros de teste novos: `core/__tests__/capital.test.ts`, `components/__tests__/WithdrawalModal.test.tsx`, `app/__tests__/banca.test.tsx`) verdes, sem quebras no baseline (6 suites / 56 testes).
2. `npx tsc --noEmit` → 0 erros novos.
3. `npx eslint .` → 0 erros (comparar com baseline antes das tasks).
4. Fluxo manual E2E com `supabase functions serve`:
   - Publicar depósito capital (receipt capital) → aprovar → conta credita (soma).
   - Criar saque client → `mark_withdrawal_paid` → débito correto + estado paid no app (realtime).
   - `upsert_capital_account` com meta_percent=40 → app mostra meta 40% e progresso recalculado.
5. **Commit final** do remanescente da feature (se houver) e resumo de diff.

---

## Critérios de aceitação (resumo)
- [ ] DB: `meta_percent` default 25; `payment_receipts` + `withdrawal_requests` em realtime; `mutation_credit_capital_account` soma; `paid_at` em withdrawal_requests.
- [ ] Server: `approve_receipt` credita capital (soma) para `plan='capital'` e `premium+referral`; best-effort; atómico e não duplica em cone pendente→aprovado; **não sobrescreve a subscription** com `plan='capital'`.
- [ ] Server: `mark_withdrawal_paid` transição approved→paid + débito de achieved/total_withdrawn idempotente, com 409 em estados inválidos; grava `paid_at`.
- [ ] Server: `upsert_capital_account` aceita `meta_percent` válido (0-100).
- [ ] Client: 5 ficheiros de teste novos verdes; `capital.*` i18n pt/en.
- [ ] UX: hero Banca com progresso a partir da meta do servidor; saque abre `WithdrawalModal` com limite <= saldo publicado; depósito mínimo por moeda (`$50` / `50 000 Kz`).

## Regras de execução
- Nunca incluir ficheiros não relacionados do working tree nos commits.
- Servidor sem harness: testes são os comandos de verificação/curl documentados em cada task; correr antes de cada commit de server.
- Commit por task; mensagens curtas em PT no estilo do repo.
- Se qualquer task encontrar um desvio do spec (ex.: coluna já existente, campo diferente), parar e sinalizar — não adaptar silenciosamente.