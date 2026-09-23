# Gestão de Capital v2 - Design Spec

## Overview

Redesenhar o fluxo de Gestão de Capital ("banca") para um funcionamento profissional e coerente de ponta a ponta. Hoje o fluxo divide-se entre 3 fontes de verdade (config local em AsyncStorage, conta no servidor e carteira de movimentos) com fallbacks arbitrários, números inconsistentes e um CTA de levantamento que não faz nada (apenas `Alert`).

**Goal:** Uma única fonte de verdade no servidor (`capital_accounts` + `payment_receipts` + `withdrawal_requests`), fluxo de dinheiro coerente (depósito de capital credita, levantamento é real e debita), e tela da banca profissional (hero, meta da equipa, relatórios, histórico, simulador e plano de crescimento como planeamento local).

**Architecture:** Servidor autoritativo; cliente apenas consome, deriva e apresenta. Migração SQL + ajustes na edge `admin-manage` + refactor dos hooks e da tela `banca.tsx`.

**Regra de acesso:** a tela da banca continua premium-gated (`canAccessBanca`), como hoje.

---

## 1. Fonte única de verdade

`capital_accounts` é a conta autoritativa. O cliente deixa de ler saldos de `useBanca` (AsyncStorage) ou de misturar fontes.

### 1.1 Migração SQL (novo ficheiro `supabase/migrations/20260923080000_capital_management_v2.sql`)

```sql
alter table public.capital_accounts
  add column if not exists meta_percent numeric(8,2) not null default 25;

-- Histórico ao vivo: depósitos aprovados e levantamentos visíveis em tempo real
do $$ begin
  alter publication supabase_realtime add table public.payment_receipts;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.withdrawal_requests;
exception when duplicate_object then null;
end $$;
```

### 1.2 Derivações (apenas no cliente, a partir do servidor)

- `capital` = investido (base)
- `achieved` = saldo atual
- `profit = achieved - capital`
- `profitPct = capital > 0 ? (profit / capital) * 100 : 0`
- `metaPercent` = `capital_accounts.meta_percent` (servidor)
- `targetValue = capital * metaPercent / 100`
- `progressPct = clamp(profit / targetValue, 0, 100)` quando `targetValue > 0`
- `withdrawable = max(0, achieved)` (máximo levantável)

Helpers puros em `src/core/capital.ts` (testáveis).

### 1.3 `useBanca` deixa de alimentar saldos

`useBanca` passa a ser apenas **planner local** (escolha de estratégia e input do simulador). Remover dos pontos de cálculo de saldo:
- `banca.tsx` — todos os saldos passam a vir de `useCapitalAccount`.
- `depositos.tsx` (hero) — passa a usar `useCapitalAccount` (`account.achieved`) em vez de `banca.achieved`; fallback para `0` quando não há conta.

---

## 2. Fluxo de dinheiro coerente

### 2.1 Depósito de capital credita sempre (`admin-manage` → `handleApproveReceipt`)

Ao aprovar um recibo:
- **`plan = 'capital'`**: incrementa a conta de capital do utilizador na moeda do recibo:
  - se a conta não existir → cria com `capital = amount`, `achieved = amount`, `currency = recibo.currency`.
  - se existir → `capital += amount`, `achieved += amount` (e `currency` atualizada para a do recibo).
- **`plan = 'premium'` + `referral_code`**: comportamento atual mantém-se (cria/inicializa a conta com o valor pago no primeiro upsert; não sobrescreve uma conta já existente com valor menor).
- Falha ao creditar NÃO deve bloquear a ativação do plano (best-effort com `console.error`, como hoje).

### 2.2 Levantamento real integrado

- Nova componente `src/components/WithdrawalModal.tsx`:
  - Campos: método (chips, mesmos métodos do `/depositos`), montante (`KeyboardType=decimal-pad`), detalhes (multiline, placeholder consoante o método — reutilizar `getDetails`).
  - Moeda fixa = moeda da conta de capital.
  - Validações:
    - método obrigatório;
    - montante > 0 e <= `withdrawable` (montante acima do saldo → erro visível);
    - detalhes obrigatórios.
  - Submissão: `submitWithdrawalRequest({ method, amount, currency, details })` (servidor) + `addMovement({ type: 'withdrawal', method, amount, currency, status: 'pendente', notes })` (carteira local), mesmo padrão de `/depositos.tsx`.
  - Em caso de erro no servidor: manter a cidade local `pendente` e mostrar `Alert` de erro com opção de repetir — o pedido não se perde.
- CTA na banca passa a abrir o `WithdrawalModal` (substitui o `Alert` falso).

### 2.3 Levantamento debita no servidor (`admin-manage` → `mark_withdrawal_paid`)

Ao marcar como **pago**:
- Ler `withdrawal_requests` (id).
- Apenas se o estado anterior não for `paid` (evitar duplo débito; transição atómica com `.eq('status','approved')`).
- Se a conta de capital existir **e** a moeda do pedido == moeda da conta → `achieved -= amount` e `total_withdrawn += amount` (guardando `achieved >= 0`; se `amount > achieved` por qualquer razão, cap a `0` e logar).
- `approve_withdrawal` mantém-se como hoje (não debita — o dinheiro só "sai" quando marcado pago).
- Assegurar RLS service_role (já existente).

### 2.4 Meta publicada pela equipa

- `upsert_capital_account` aceita `meta_percent` opcional (`adminApi.upsertCapitalAccount` inclui o campo).
- `post_capital_report` mantém a atualização de `achieved` (e `capital` na primeira criação) — inalterado.

---

## 3. Tela da banca (`src/app/banca.tsx` redesenhadada)

Estrutura (estado ativo):

1. **Hero (GradientCard)** — badge de estado (`active`/`paused`), saldo atual (`achieved`), investido (`capital`), lucro com **sinal e cor corretos** (verde se `profit >= 0`, destrutivo se negativo, prefixo `+`/``/`-`).
2. **Card Meta/Progresso** — `Meta: +X%` do servidor; barra de progresso `progressPct`; labels `+profit` e `Meta: +targetValue`; quando quita a meta ultrapassa 100%, mostrar conquista (100% + badge "meta atingida").
3. **Último relatório da equipa** (já existente; mantém ligação ao `/diario-trader`).
4. **Grelha de estatísticas** — Investido, Lucro (com sinal/cor), Meta (servidor), Levantado. Corrigir lucro sempre verde/prefixo `+` hardcoded.
5. **Histórico de capital** — lista combinada:
   - Depósitos de capital **aprovados**: `payment_receipts` `plan='capital'` e `status='approved'` (novo hook `useCapitalDeposits`; RLS own-select já existe; realtime via publicação adicionada em 1.1).
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

### `useCapitalAccount` (alterações)

- Tipagem: `CapitalAccount` com `meta_percent: number`.
- Devolve `metaPercent: account?.meta_percent ?? BANCA_DEFAULTS.metaPercent` (fallback local `25` apenas para UI antes do primeiro load — nunca para cálculo definitivo numa conta existente).
- Realtime de `capital_accounts`/`capital_reports` mantém-se.

---

## 5. Server / edge (`supabase/functions/admin-manage/index.ts`)

- `upsert_capital_account`: passar a aceitar `meta_percent`.
- `handleApproveReceipt`: adicionar crédito de capital para `plan='capital'` (§2.1), mantendo fluxo premium+afiliado e notificações.
- `mark_withdrawal_paid`: débito transacional (§2.3) com glossário anti-duplo-débito.
- Sem novas funções nem novas tabelas além da coluna `meta_percent` (evitar ledger completo — YAGNI).

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

Base para mocking: `jest.config.js` já tem `moduleNameMapper` `@/` → `src/` e `preset jest-expo`.

---

## 9. Fora do escopo (YAGNI)

- Ledger completo de transações (opção C) — adiado.
- Pagamentos via gateway/API (sem comprovativo) — não altera o modelo actual.
- Mudanças fora do fluxo de capital (comunidade, sinais, administração de sinais).
- Filtros/pesquisa avançada no histórico da banca (apenas listagem ordenada por data).

---

## 10. Critérios de aceitação

1. Um recibo `plan='capital'` aprovado credita `capital`/`achieved` na conta do utilizador.
2. Levantamento na banca cria pedido real (servidor) visível no admin; ao ser marcado `paid`, `achieved` diminui e `total_withdrawn` aumenta.
3. Saldo/lucro/meta derivados exclusivamente de `capital_accounts` (sem AsyncStorage) e com sinais/cor corretos.
4. Histórico de capital mostra depósitos, erros de depósito e levantamentos com status reais.
5. Simulador/plano de crescimento continuam locais e não afectam saldos.
6. `npx jest` verde (novos testes + regressão).