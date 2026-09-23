# Gestão de Capital v2 - Design Spec

## Overview

Redesenhar o fluxo de Gestão de Capital ("banca") para um funcionamento profissional e coerente de ponta a ponta. Hoje o cliente divide-se entre 3 fontes de verdade (config local em AsyncStorage, conta no servidor e carteira de movimentos), com `approve_receipt` (afiliado) a **sobrescrever** em vez de somar e sem crédito para `plan='capital'`; o CTA de levantamento na banca não faz nada (apenas `Alert`); e o histórico não mostra o estado real dos levantamentos.

**Goal:** Uma única fonte de verdade no servidor (`capital_accounts` + `payment_receipts` + `withdrawal_requests`), fluxo de dinheiro coerente (depósito de capital credita sempre e soma; levantamento é real, debita uma vez e aparece no histórico com estado real), meta publicada pela equipa, e tela da banca profissional.

**Architecture:** Servidor autoritativo (já existe no projeto mobile); o cliente apenas consome, deriva e apresenta. Migração SQL + ajustes no `admin-manage` mobile + refactor dos hooks e da tela `banca.tsx`.

**Alvo do backend:** projeto Supabase **mobile** (`mobile/supabase/`, project_id `the-magic-trader-mobile`) — é o que a app mobile usa. NÃO o projeto web (`supabase/` na raiz).

**Regra de acesso:** a tela da banca continua premium-gated (`canAccessBanca`), como hoje.

---

## 1. Fonte única de verdade

`capital_accounts` é a conta autoritativa. O cliente deixa de ler saldos de `useBanca` (AsyncStorage) ou de misturar fontes.

### 1.1 Estado actual (verificado no projeto mobile)

Já existe e funciona:
- Tabelas `capital_accounts` / `capital_reports` criadas pela migração `mobile/supabase/migrations/20260823080000_capital_management.sql`, com RLS (`capital_accounts_select_own` + `capital_accounts_write_service`; idem reports) e realtime publicado.
- No `admin-manage` mobile (ficheiro `mobile/supabase/functions/admin-manage/index.ts`, switch-case) existem `list_capital_accounts` (L801), `upsert_capital_account` (L823), `post_capital_report` (L840, já calcula profit/profitPct e atualiza `achieved`/`capital` na 1ª conta) e `list_capital_reports` (L897).
- RLS de leitura própria: `withdrawal_requests` → `wr_select_own`/`wr_insert_own` (migração `20260820010000`); `payment_receipts` → `receipts_select_own` (migração `20260818140000`). (Pronto para realtime.)

Falta / está errado:
- **`meta_percent` não existe** em `capital_accounts` — a meta tem de vir da equipa (servidor), hoje usa-se `config.metaPercent` local.
- **`payment_receipts` e `withdrawal_requests` NÃO estão na publicação realtime** (não há `alter publication` para elas em nenhuma migração mobile).
- **`handleApproveReceipt` (L352) não credita `plan='capital'`** e, para `plan='premium'+referral_code`, usa `upsert(...{capital: amount, achieved: amount}, {onConflict: 'user_id'})` que **SOBRESCREVE** a conta (um pagamento seguinte resume o saldo ao novo montante) em vez de somar.
- **`mark_withdrawal_paid` (L1032) não debita** `achieved` nem `total_withdrawn`, e não tem guarda anti-duplo-débito.
- Cliente `banca.tsx`: mistura `account` e `config`; lucro no card de stats é sempre verde com `+`; label da meta tem literal português `Meta:` e prefixo `+`; `+25%` e `$50 USD` hardcoded no estado inativo; CTA de levantamento é um `Alert` falso (L250-255).

### 1.2 Migração SQL (novo ficheiro `mobile/supabase/migrations/20260923080000_capital_management_v2.sql`)

```sql
-- Meta publicada pela equipa (coluna nova; default 25% apenas como saneamento).
alter table public.capital_accounts
  add column if not exists meta_percent numeric(8,2) not null default 25;

-- Histórico de capital e levantamentos ao vivo (padrão DO/EXCEPTION do repo).
do $$ begin
  alter publication supabase_realtime add table public.payment_receipts;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.withdrawal_requests;
exception when duplicate_object then null;
end $$;
```

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

`useBanca` continua a ser **planner local** (escolha de estratégia/`planId` para o simulador e plano de crescimento). Nenhuma alteração no hook. Remover o consumo de `config.capital/achieved/currency/totalWithdrawn` para saldos:
- `banca.tsx` — saldos/lucro/meta/totalWithdrawn passam a vir de `useCapitalAccount`.
- `depositos.tsx` (hero e seção levantar) — passa a usar `useCapitalAccount` (`account.achieved`) em vez de `banca.achieved`; fallback para `0` quando não há conta.

---

## 2. Fluxo de dinheiro coerente

### 2.1 `handleApproveReceipt` credita sempre (soma, não sobrescreve)

Novo helper interno da edge `creditCapitalAccount(userId, amount, currency)`:
- lê a conta atual por `user_id` (`maybeSingle`);
- se não existir → insere `{ user_id, currency, capital: amount, achieved: amount, status: 'active' }`;
- se existir → `capital += amount`, `achieved += amount`, `currency` atualizada só na criação;
- devolve void; nunca lança (best-effort).

Chamado em `handleApproveReceipt` após a ativação do plano:
- **`plan = 'capital'`**: `creditCapitalAccount` sempre (qualquer montante>0).
- **`plan = 'premium'` + `referral_code`** (regra afiliado de `continue.md` #4): substituir o `upsert` que sobrescreve por `creditCapitalAccount` (**passa a somar**, incluindo renovações de 30 dias — decisão aprovada pelo utilizador: "credita sempre").
- Falha ao creditar NÃO bloqueia a ativação do plano (best-effort + `console.error`), como hoje.

### 2.2 Levantamento real integrado

- Nova componente `src/components/WithdrawalModal.tsx`:
  - Campos: método (chips, mesmos `PAYMENT_METHODS` do `/depositos`), montante (`keyboardType='decimal-pad'`), detalhes (multiline; placeholder = `PAYMENT_METHODS.find(...).getDetails(t)`).
  - Moeda fixa = moeda da conta de capital.
  - Validações: método obrigatório; `montante > 0` e `montante <= withdrawable` (acima do saldo → erro visível); detalhes obrigatórios.
  - Submissão: `submitWithdrawalRequest({ method, amount, currency, details })` (insert via RLS `wr_insert_own`) + `addMovement({ type: 'withdrawal', method, amount, currency, status: 'pendente', notes: details })` (carteira local), padrão de `depositos.tsx` `submitWithdrawal`.
  - Falha no servidor → manter a carteira local `pendente` e mostrar `Alert` de erro com "Tentar novamente" (o pedido não se perde). Modal fecha após sucesso.
- CTA na banca passa a abrir o `WithdrawalModal` (substitui o `Alert` falso).

### 2.3 `mark_withdrawal_paid` debita no servidor (uma vez)

- Ler o pedido por id (`maybeSingle`); se não existir → erro 404.
- Guardas: `status === 'paid'` → responde `{ ok: true }` (idempotente); `status !== 'approved'` → erro 400 ("ainda não aprovado").
- Transição atómica: `update ... .eq('id', id).eq('status', 'approved')` com `.select('id').maybeSingle()`; se devolver vazio (outro admin já marcou) → `{ ok: true }` sem debitar.
- Débito (só se conta existe **e** `acc.currency === wd.currency`): `achieved = max(0, achieved - amount)`, `total_withdrawn += amount`, `updated_at` novo.
- Usa cliente service-role (ignora RLS), como toda a edge.

### 2.4 Meta publicada pela equipa

- `upsert_capital_account`: adicionar `meta_percent` (opcional) ao `row` do upsert.
- `post_capital_report`: inalterado (já atualiza `achieved`).

---

## 3. Tela da banca (`src/app/banca.tsx` redesenhadada)

Estrutura (estado ativo):

1. **Hero (GradientCard)** — badge de estado (`active`/`paused`), saldo atual (`achieved`), investido (`capital`), lucro com **sinal e cor corretos** (verde se `profit >= 0`, destrutivo se negativo; prefixo `+/–` sem duplicação).
2. **Card Meta/Progresso** — `Meta: +X%` do servidor (`metaPercent`); barra `progressPct`; labels `+profit` e `Meta: +targetValue` (via `t`); se `progressPct >= 100`, badge "meta atingida".
3. **Último relatório da equipa** (mantém ligação ao `/diario-trader`).
4. **Grelha de estatísticas** — Investido, Lucro (sinal/cor do `profit`), Meta (servidor), Levantado. Corrigir lucro sempre verde/`+`.
5. **Histórico de capital** — combina:
   - depósitos de capital **aprovados**: `payment_receipts` (`plan='capital'`, `status='approved'`) via `useCapitalDeposits` (RLS own-select existe; realtime novo);
   - depósitos de capital **pendentes/rejeitados**: `wallet_movements` (`plan='capital'`) via `useMovements`;
   - levantamentos com status real: `withdrawal_requests` via `useWithdrawals` (RLS own-select existe; realtime novo).
   - Linha com ícone, título, data e badge de estado; ordenação por data desc.
6. **Card Levantamento** — badge "semanal", CTA abre `WithdrawalModal`.
7. **Simulador** (`CapitalSimulatorCard`) + **Plano de Crescimento** (`GrowthPlanSection`) — planeamento local.

Estado inativo (sem conta `capital_accounts`):
- Copy "Como Funciona" sem valores hardcoded; `$50 USD` e `+25%` hardcoded substituídos por `MIN_CAPITAL_DEPOSIT` e `metaPercent` de `BANCA_DEFAULTS`.
- CTA primário "Fazer Primeiro Depósito" navega para `/depositos` com `amount`/`currency` (padrão existente L129-133).

Remover do `banca.tsx`: consumo de `config.capital/achieved/totalWithdrawn` para saldos, hero inativo hardcoded (`+25%`, `$50 USD`), label `Meta:` literal, `Alert` de levantamento falso.

---

## 4. Camada de dados (cliente)

| Ficheiro | Acção |
|---|---|
| `src/core/capital.ts` | (novo) `profit`, `profitPct`, `progressPct`, `withdrawable`, `clamp` |
| `src/hooks/useCapitalDeposits.ts` | (novo) lê `payment_receipts` próprios `plan='capital'` (react-query + realtime) |
| `src/hooks/useWithdrawals.ts` | (novo) lê `withdrawal_requests` próprios (react-query + realtime), devolve `{ withdrawals, refetch }` |
| `src/hooks/useCapitalAccount.ts` | expõe `metaPercent` (`account.meta_percent ?? 25` apenas antes do 1º load); `CapitalAccount` tipada com `meta_percent` |
| `src/components/WithdrawalModal.tsx` | (novo) §2.2 |
| `src/app/banca.tsx` | redesenho §3 |
| `src/app/depositos.tsx` | hero + "Disponível para levantar" usam `useCapitalAccount` |
| `src/components/CapitalSimulatorCard.tsx` | usa `MIN_CAPITAL_DEPOSIT` (remove `disabled={amount < 50}`) |
| `src/core/types.ts` | `CapitalAccount` ganha `meta_percent: number` |
| `src/lib/plans.ts` | nova constante `MIN_CAPITAL_DEPOSIT: Record<Currency, number> = { usd: 50, aoa: 50000 }` |
| `src/lib/adminApi.ts` | `upsertCapitalAccount` aceita `meta_percent`; `AdminCapitalAccount` inclui `meta_percent` |

---

## 5. Server / edge (`mobile/supabase/functions/admin-manage/index.ts`)

As 4 ações de capital já existem. Alterações mínimas:

1. `upsert_capital_account` (L823): aceitar `meta_percent` opcional no `row`.
2. Novo helper `creditCapitalAccount` + uso em `handleApproveReceipt` (L352): crédito `capital` (somando) e substituição do upsert de premium+referral por soma (§2.1).
3. `mark_withdrawal_paid` (L1032): débito idempotente com guardas (§2.3).
4. Sem novas tabelas/leggers (YAGNI).

Estilo: `json({...})` / `errorJson(msg, status)` e mensagens em PT, como o resto do ficheiro. `handleApproveReceipt` continua a usar `notifyUser`/`sendUserEmail`.

---

## 6. i18n

- Novas/alteradas keys **em todos os 14 locale files**? Não — `fallbackLng: 'pt'` cobre os restantes, mas o padrão do repo mantém os 14 (os 12 restantes têm o mesmo conjunto de top-level keys). **Decisão de scope:** adicionar apenas a `pt.json` + `en.json` (os 12 restantes caem no fallback pt). Novas keys no namespace `capital.*` (já existente em todos):
  - `history` (título), `historyEmpty`, `statusApproved`, `statusRejected`(sem conflito com `recusado`), `statusPending`, `withdrawal` (badge "levantamento"), `capitalDeposit`, `depositCapital`, `metaAchieved` ("meta atingida"), `withdrawErrorBalance` ("montante superior ao saldo"), `simulatorDepositCta` (reutilizada).
- Reutilizar keys existentes quando aplicável (`depositos.statusPendente`, `depositos.movementCapital`, etc.).

---

## 7. Tratamento de erros

- **Levantamento:** falha no servidor → carteira local `pendente` + `Alert` com "Tentar novamente"; saldo só muda após `paid`.
- **Dados indisponíveis (offline / sem conta):** estado inativo com copy; react-query mantém cache; realtime atualiza ao voltar online.
- **Débito:** moeda do pedido deve corresponder à conta; `achieved` nunca negativo (cap + log); pedido `paid` não debita duas vezes.
- **Crédito:** falha não bloqueia ativação (best-effort + log).

---

## 8. Testes (TDD — `npx jest`; sem script `test`, correr `npx jest`)

- **Unit `src/core/capital.test.ts`:** `profit`, `profitPct` (divisão por zero → 0), `progressPct` (clamp 0..100; target=0 → 0), `withdrawable` (nunca negativo).
- **Component `WithdrawalModal.test.tsx` (RTL):** validações (sem método; montante ≤ 0; montante > saldo → msg de erro; sem detalhes → bloqueado); submissão válida chama `submitWithdrawalRequest` e `addMovement` (mock via `jest.mock('@/lib/adminApi')` e `@/hooks/useMovements`); spy em `Alert.alert`.
- **Component `banca.test.tsx` (RTL):** lucro negativo → cor destrutiva e sinal `-`; meta vinda do servidor (`meta_percent`); CTA de levantamento abre o modal; premium-lock não bloqueia cliente premium. Mocks: `react-i18next`, `@/hooks/useCapitalAccount`, `@/hooks/useSubscription`, `@/hooks/useMovements`, `@/hooks/useWithdrawals` (ou o hook real com supabase mockado).
- **Padrão de teste usado no repo:** mockar `react-i18next` com tabela de tradução inline + `jest.spyOn(Alert, 'alert')` (ver `UserDetailModal.test.tsx`).
- **Edge (sem harness):** validação manual — `supabase functions serve` + curl, e `supabase db push` + SQL.

---

## 9. Fora do escopo (YAGNI)

- Ledger completo de transações (opção C) — adiado.
- Pagamentos via gateway/API (sem comprovativo) — não altera o modelo atual.
- Mudanças fora do fluxo de capital (comunidade, sinais, Booms).
- Filtros/pesquisa no histórico da banca (apenas listagem por data desc).
- Alterações ao projeto web Supabase/`admin-manage` web.

---

## 10. Critérios de aceitação

1. Um recibo `plan='capital'` aprovado **soma** (`capital += amount`, `achieved += amount`) à conta (ou cria).
2. Um recibo `plan='premium'` com `referral_code` **soma** (não sobrescreve) — inclui renovações.
3. `mark_withdrawal_paid` debita `achieved`/`total_withdrawn` uma única vez, com guardas idempotentes e moeda coerente.
4. Meta da banca vem de `capital_accounts.meta_percent` (painel admin consegue publicá-la via `upsert_capital_account`).
5. Histórico de capital mostra depósitos aprovados, depósitos pendentes/rejeitados e levantamentos reais, ao vivo (realtime de `payment_receipts` + `withdrawal_requests`).
6. Saldo/lucro/meta sem AsyncStorage e com sinais/cor corretos; `+25%`/`$50 USD` removidos.
7. Simulador/plano de crescimento continuam locais e não afetam saldos.
8. `npx jest` verde (novos testes + regressão).