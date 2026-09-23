# Gestão de Capital v2 - Design Spec

## Overview

Redesenhar o fluxo de Gestão de Capital ("banca") para um funcionamento profissional e coerente de ponta a ponta. Hoje o fluxo divide-se entre 3 fontes de verdade (config local em AsyncStorage, conta no servidor e carteira de movimentos) com fallbacks arbitrários, números inconsistentes e um CTA de levantamento que não faz nada (apenas `Alert`).

**Goal:** Uma única fonte de verdade no servidor (`capital_accounts` + `payment_receipts` + `withdrawal_requests`), fluxo de dinheiro coerente (depósito de capital credita, levantamento é real e debita), e tela da banca profissional (hero, meta da equipa, relatórios, histórico, simulador e plano de crescimento como planeamento local).

**Architecture:** Servidor autoritativo; cliente apenas consome, deriva e apresenta. Migração SQL + ajustes na edge `admin-manage` + refactor dos hooks e da tela `banca.tsx`.

**Regra de acesso:** a tela da banca continua premium-gated (`canAccessBanca`), como hoje.

---

## 1. Fonte única de verdade

`capital_accounts` é a conta autoritativa. O cliente deixa de ler saldos de `useBanca` (AsyncStorage) ou de misturar fontes.

### 1.1 Estado actual (verificado no repositório)

- **`capital_accounts` e `capital_reports` NÃO existem em qualquer migração** — `useCapitalAccount` consulta-os diretamente via cliente Supabase (JWT do utilizador): sem tabela e sem políticas RLS, a consulta falha hoje (`relation does not exist` / permissão negada) e a banca não tem dados.
- O painel admin chama `list_capital_accounts`, `upsert_capital_account`, `post_capital_report`, `list_capital_reports` (em `adminApi.ts`), mas **a edge `admin-manage` NÃO implementa estas ações** → painel de capital partido.
- `approve_receipt` ativa o plano de 30 dias mas **não credita capital nenhum** (nem compensação por referência).
- `mark_withdrawal_paid` muda o estado para `paid` mas **não debita o saldo**.
- Realtime: `payment_receipts` já está publicada; `withdrawal_requests` **não** está.

### 1.2 Migração SQL (novo ficheiro `supabase/migrations/20260923080000_capital_management_v2.sql`)

Cria as tabelas que faltam (idempotente, para funcionar quer existam ou não remotamente), adiciona `meta_percent`, políticas RLS e realtime:

```sql
create table if not exists public.capital_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'usd' check (currency in ('usd','aoa')),
  capital numeric(14,2) not null default 0,
  achieved numeric(14,2) not null default 0,
  meta_percent numeric(8,2) not null default 25,
  total_withdrawn numeric(14,2) not null default 0,
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create table if not exists public.capital_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  starting_balance numeric(14,2) not null,
  ending_balance numeric(14,2) not null,
  profit numeric(14,2) not null default 0,
  profit_pct numeric(8,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists capital_reports_user_idx on public.capital_reports (user_id, created_at desc);

alter table public.capital_accounts enable row level security;
alter table public.capital_reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users select own capital account' and tablename = 'capital_accounts') then
    create policy "Users select own capital account" on public.capital_accounts
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users select own capital reports' and tablename = 'capital_reports') then
    create policy "Users select own capital reports" on public.capital_reports
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- Meta publicada pela equipa e histórico ao vivo
do $$ begin
  alter publication supabase_realtime add table public.capital_accounts;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.capital_reports;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.withdrawal_requests;
exception when duplicate_object then null;
end $$;
```

> `payment_receipts` já está publicada (migração `20260822000000`). Publicar `withdrawal_requests` é novo e necessário para o histórico de levantamentos ao vivo.

### 1.3 Derivações (apenas no cliente, a partir do servidor)

- `capital` = investido (base)
- `achieved` = saldo atual
- `profit = achieved - capital`
- `profitPct = capital > 0 ? (profit / capital) * 100 : 0`
- `metaPercent` = `capital_accounts.meta_percent` (servidor)
- `targetValue = capital * metaPercent / 100`
- `progressPct = clamp(profit / targetValue, 0, 100)` quando `targetValue > 0`
- `withdrawable = max(0, achieved)` (máximo levantável)

Helpers puros em `src/core/capital.ts` (testáveis).

### 1.4 `useBanca` deixa de alimentar saldos

`useBanca` passa a ser apenas **planner local** (escolha de estratégia e input do simulador). Remover dos pontos de cálculo de saldo:
- `banca.tsx` — todos os saldos passam a vir de `useCapitalAccount`.
- `depositos.tsx` (hero) — passa a usar `useCapitalAccount` (`account.achieved`) em vez de `banca.achieved`; fallback para `0` quando não há conta.

---

## 2. Fluxo de dinheiro coerente

### 2.1 Depósito de capital credita sempre (`admin-manage` → ação `approve_receipt`)

Hoje `approve_receipt` (linha ~365 de `admin-manage/index.ts`) só ativa o plano de 30 dias (`upsertSubscription`) e notifica — **não credita qualquer capital**. A alteração:

Ao aprovar um recibo, com o cliente service-role (ignora RLS):
- **`plan = 'capital'`**: credita a conta de capital do utilizador na moeda do recibo:
  - se a conta não existir → cria com `capital = amount`, `achieved = amount`, `currency = recibo.currency`.
  - se existir → `capital += amount`, `achieved += amount` (e `currency` atualizada para a do recibo na 1ª criação).
- **`plan = 'premium'` + `referral_code`** (regra afiliado de `continue.md` #4: "pagamento premium = capital"): credita igualmente `capital += amount`, `achieved += amount` (afiliado comprou, o capital entra na sócia). **Ponto a confirmar pelo utilizador no review:** se o mesmo afiliado renovar ao fim de 30 dias, o capital deve voltar a aumentar (sem crédito nesta spec? assumimos "sim, credita sempre" — mais simples e alinhado com "depósito credita sempre").
- Falha ao creditar NÃO bloqueia a ativação do plano nem devolve erro (best-effort com `console.error`).

### 2.2 Levantamento real integrado

- Nova componente `src/components/WithdrawalModal.tsx`:
  - Campos: método (chips, mesmos métodos do `/depositos`), montante (`KeyboardType=decimal-pad`), detalhes (multiline, placeholder consoante o método — reutilizar `getDetails`).
  - Moeda fixa = moeda da conta de capital.
  - Validações:
    - método obrigatório;
    - montante > 0 e <= `withdrawable` (montante acima do saldo → erro visível);
    - detalhes obrigatórios.
  - Submissão: `submitWithdrawalRequest({ method, amount, currency, details })` (servidor) + `addMovement({ type: 'withdrawal', method, amount, currency, status: 'pendente', notes })` (carteira local), mesmo padrão de `/depositos.tsx`.
  - Em caso de erro no servidor: manter a carteira local `pendente` e mostrar `Alert` de erro com opção de repetir — o pedido não se perde.
- CTA na banca passa a abrir o `WithdrawalModal` (substitui o `Alert` falso).

### 2.3 Levantamento debita no servidor (`admin-manage` → `mark_withdrawal_paid`)

Hoje `mark_withdrawal_paid` só muda o estado para `paid`. A alteração, ao marcar como **pago** (cliente service-role):
- Ler a `withdrawal_requests` pelo id.
- Transição atómica anti-duplo-débito: atualizar `status='paid'` apenas com `.eq('id', id).eq('status', 'approved')`; se devolver 0 linhas, não debitar.
- Se a conta de capital existir **e** a moeda do pedido == moeda da conta → `achieved -= amount` e `total_withdrawn += amount`; se `amount > achieved`, cap a `0` e logar.
- `approve_withdrawal` / `reject_withdrawal` mantêm-se como hoje (o dinheiro só "sai" quando marcado pago).
- RLS: service_role ignora RLS (já é o caso em toda a edge).

### 2.4 Meta publicada pela equipa

- `upsert_capital_account` (ação a criar, ver §5) aceita `meta_percent` opcional (`adminApi.upsertCapitalAccount` passa a incluir o campo).
- `post_capital_report` mantém a atualização de `achieved` (e `capital` na primeira criação) — ação a criar, ver §5.

---

## 3. Tela da banca (`src/app/banca.tsx` redesenhadada)

Estrutura (estado ativo):

1. **Hero (GradientCard)** — badge de estado (`active`/`paused`), saldo atual (`achieved`), investido (`capital`), lucro com **sinal e cor corretos** (verde se `profit >= 0`, destrutivo se negativo, prefixo `+`/``/`-`).
2. **Card Meta/Progresso** — `Meta: +X%` do servidor; barra de progresso `progressPct`; labels `+profit` e `Meta: +targetValue`; quando quita a meta ultrapassa 100%, mostrar conquista (100% + badge "meta atingida").
3. **Último relatório da equipa** (já existente; mantém ligação ao `/diario-trader`).
4. **Grelha de estatísticas** — Investido, Lucro (com sinal/cor), Meta (servidor), Levantado. Corrigir lucro sempre verde/prefixo `+` hardcoded.
5. **Histórico de capital** — lista combinada:
   - Depósitos de capital **aprovados**: `payment_receipts` `plan='capital'` e `status='approved'` (novo hook `useCapitalDeposits`; RLS own-select já existe; realtime já publicado na migração `20260822000000`).
   - Depósitos de capital **pendentes/rejeitados**: `wallet_movements` `plan='capital'` (via `useMovements`).
   - Levantamentos com status real: `useWithdrawals` (`withdrawal_requests`, RLS own-select já existe).
   - Linhas com ícone, label, data e badge de estado. Ordenação por data (desc).
6. **Card Levantamento** — descrição + badge "semanal", CTA abre `WithdrawalModal`.
7. **Simulador** (`CapitalSimulatorCard`) + **Plano de Crescimento** (`GrowthPlanSection`) — planeamento local.

Estado inativo (sem conta de capital e sem movimentos de capital/depósito):
- Copy melhorada ("Como funciona") sem valores hardcoded (`$50 USD` passa a constante de produto `MIN_CAPITAL_DEPOSIT` exportada de `src/lib/plans.ts` e usada pelo simulador e pela banca).
- CTA primário "Começar" → navega para `/depositos?amount=<mínimo>&currency=<moeda>`.

Remover do `banca.tsx`: `useBanca` (saldos), hero inativo hardcoded, `Alert` de levantamento.

---

## 4. Camada de dados (cliente)

### Novos ficheiros / refactors

| Ficheiro | Acção |
|---|---|
| `src/core/capital.ts` | `profit`, `profitPct`, `progressPct`, `withdrawable`, `clamp` (puros) |
| `src/hooks/useCapitalDeposits.ts` | lê `payment_receipts` próprios `plan='capital'` (react-query + realtime) |
| `src/hooks/useWithdrawals.ts` | lê `withdrawal_requests` próprios (react-query + realtime), devolve lista + `refetch` |
| `src/hooks/useCapitalAccount.ts` | expõe `metaPercent` (de `meta_percent`); `account` passa a tipar `CapitalAccount` com `meta_percent` |
| `src/components/WithdrawalModal.tsx` | ver §2.2 |
| `src/app/banca.tsx` | redesenho completo (§3) |
| `src/app/depositos.tsx` | hero usa `useCapitalAccount`; exportar `MIN_CAPITAL_DEPOSIT` |
| `src/components/CapitalSimulatorCard.tsx` | usa `MIN_CAPITAL_DEPOSIT` (remove `disabled={amount < 50}` hardcoded) |
| `src/core/types.ts` | `CapitalAccount` ganha `meta_percent` |
| `src/lib/adminApi.ts` | `upsertCapitalAccount` aceita `meta_percent`; tipos `AdminCapitalAccount` atualizados |
| `src/lib/plans.ts` | nova constante exportada `MIN_CAPITAL_DEPOSIT` (substitui valores `50`/`$50` hardcoded) |

### `useCapitalAccount` (alterações)

- Tipagem: `CapitalAccount` com `meta_percent: number`.
- Devolve `metaPercent: account?.meta_percent ?? BANCA_DEFAULTS.metaPercent` (fallback local `25` apenas para UI antes do primeiro load — nunca para cálculo definitivo numa conta existente).
- Realtime de `capital_accounts`/`capital_reports` mantém-se.

---

## 5. Server / edge (`supabase/functions/admin-manage/index.ts`)

Estado actual: a edge NÃO tem quaisquer ações de capital, embora o cliente as invoque. A completar:

1. **Implementar as 4 ações em falta** (já chamadas por `adminApi.ts`):
   - `list_capital_accounts` → `select * from capital_accounts` (order por `updated_at desc`), devolve `{ accounts }`.
   - `upsert_capital_account` → `insert ... on conflict (user_id) do update set` aceitando `capital`, `achieved`, `total_withdrawn`, `currency` e o novo `meta_percent`; devolve sucesso.
   - `post_capital_report` → insere em `capital_reports` (com `profit`/`profit_pct` calculados a partir de balances) e atualiza `capital_accounts.achieved = ending_balance` (e `capital` na primeira criação via `upsert_capital_account`).
   - `list_capital_reports` → devolve `{ reports }` filtrados por `user_id`.
2. **`approve_receipt`**: adicionar crédito de capital (§2.1) além do fluxo atual de ativação + notificação.
3. **`mark_withdrawal_paid`**: débito anti-duplo (§2.3).
4. Sem novas tabelas além das criadas na §1.2 (evitar ledger completo — YAGNI).

Nomes de ação e JSON igual ao padrão já usado na edge (`json({ success, ... })`, mensagens de erro em PT).

---

## 6. i18n

- Novas/alteradas keys em `src/lib/i18n/locales/pt.json` e `en.json` no namespace `capital.*`:
  - histórico (títulos/estados), meta atingida, erro de levantamento (montante superior ao saldo), constantes de min-depósito.
- Restantes 12 locales usam `fallbackLng: 'pt'` (config já existente).

---

## 7. Tratamento de erros

- **Levantamento:** falha no servidor → pedido fica `pendente` localmente + `Alert` com "Tentar novamente"; saldo só muda após `paid` no servidor.
- **Dados indisponíveis (offline / sem conta):** estado inativo com copy; react-query mantém cache; realtime atualiza ao voltar online.
- **Debite de levantamento:** moeda do pedido deve corresponder à conta; `achieved` nunca fica negativo (cap + log).
- **Crédito de depósito:** falha não bloqueia ativação do plano (best-effort + log).

---

## 8. Testes (TDD — `npx jest`)

- **Unit (`src/core/capital.test.ts`):** `profit`, `profitPct` (divisão por zero → 0), `progressPct` (clamps 0..100, target=0 → 0), `withdrawable` (nunca negativo).
- **Component (`WithdrawalModal.test.tsx`, RTL):**
  - validações: sem método, montante ≤ 0, montante > saldo (msg de erro), sem detalhes → submissão bloqueada;
  - submissão válida invoca `submitWithdrawalRequest` e `addMovement`.
  - `submitWithdrawalRequest`/`adminApi` mockados via `jest.mock`.
- **Component (`banca.test.tsx`, RTL):**
  - lucro negativo → cor destrutiva e sinal `-`;
  - meta vem do servidor (`meta_percent`);
  - CTA de levantamento abre o modal;
  - premium-lock não bloqueia cliente premium (`canAccessBanca=true`).
  - `useCapitalAccount`/`useSubscription` mocks.

- **Nota:** a lógica da edge `admin-manage` (crédito/débito) não tem harness automatizado no repo — validar manualmente com `supabase functions serve` + pedidos curl, e as migrações com `supabase db push` + consultas SQL.

Base para mocking: `jest.config.js` já tem `moduleNameMapper` `@/` → `src/` e `preset jest-expo`.

---

## 9. Fora do escopo (YAGNI)

- Ledger completo de transações (opção C) — adiado.
- Pagamentos via gateway/API (sem comprovativo) — não altera o modelo actual.
- Mudanças fora do fluxo de capital (comunidade, sinais, administração de sinais).
- Filtros/pesquisa avançada no histórico da banca (apenas listagem ordenada por data).

---

## 10. Critérios de aceitação

1. Um recibo `plan='capital'` aprovado credita `capital`/`achieved` na conta do utilizador (e `plan='premium'` com `referral_code` também, na regra §2.1).
2. Levantamento na banca cria pedido real (`withdrawal_requests`, RLS own-insert) visível no admin; ao ser marcado `paid`, `achieved` diminui e `total_withdrawn` aumenta (sem duplo débito).
3. Painel admin: `list_capital_accounts`, `upsert_capital_account` (com `meta_percent`), `post_capital_report`, `list_capital_reports` devolvem sucesso (hoje falham).
4. Saldo/lucro/meta derivados exclusivamente de `capital_accounts` (sem AsyncStorage) e com sinais/cor corretos.
5. Histórico de capital mostra depósitos (aprovados em `payment_receipts` + pendentes/rejeitados locais) e levantamentos com status reais, ao vivo.
6. Simulador/plano de crescimento continuam locais e não afectam saldos.
7. Migração idempotente aplicar-se-á mesmo se as tabelas já existirem remotamente (ou criá-las, se não existirem).
8. `npx jest` verde (novos testes + regressão).