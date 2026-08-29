# Web ↔ Mobile Parity — Phase 2 sub-plan (Banca + Depósitos/Saques com comprovativo)

> **Part of:** `2026-08-29-web-parity-master.md` (Phase 2). Same conventions as Phase 1: data-logic ports from `mobile/src/`, shadcn UI re-skin, `@/` alias, no `mobile/**` edits, per-task commits, verification = `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` + per-file `eslint`.
> **Sole source of mobile truth:** `zeta-digest-banca-depositos.md` (repo root) — implementers MUST read it before starting. It contains exact APIs, edge actions, table schemas and the web gap list.

**Goal:** Replace the `/banca` and `/depositos` placeholder routes with the real pages; add `payments.ts`, `formatMoney`/`formatBancaMoney`, `PAYMENT_METHODS`, the `useBanca`/`useCapitalAccount`/`useMovements` hooks, web versions of the 4 capital components, admin Receipts + Withdrawals tabs, and `canAccessBanca` on `useSubscription`.

**Dependency order:** 2.1 (payments/format/plans) → 2.2 (adminApi) → 2.3 (hooks) → 2.4 (capital components) → 2.5 (Depositos) + 2.6 (Banca) → 2.7 (admin tabs) → 2.8 (verification).

---

## Files summary

| Action | Path |
|---|---|
| Create | `src/lib/payments.ts` |
| Create | `src/hooks/useBanca.ts` |
| Create | `src/hooks/useCapitalAccount.ts` |
| Create | `src/hooks/useMovements.ts` |
| Create | `src/components/banca/PaymentModal.tsx` |
| Create | `src/components/banca/ReceiptSuccessModal.tsx` |
| Create | `src/components/banca/CapitalSimulatorCard.tsx` |
| Create | `src/components/banca/GrowthPlanSection.tsx` |
| Create | `src/components/admin/AdminReceiptsTab.tsx` |
| Create | `src/components/admin/AdminWithdrawalsTab.tsx` |
| Create | `src/pages/Banca.tsx`, `src/pages/Depositos.tsx` |
| Modify | `src/lib/format.ts` (add `formatMoney`, `formatBancaMoney`) |
| Modify | `src/lib/plans.ts` (add `PAYMENT_METHODS`) |
| Modify | `src/lib/adminApi.ts` (receipt/withdrawal functions + types) |
| Modify | `src/hooks/useSubscription.ts` (add `canAccessBanca`) |
| Modify | `src/pages/Admin.tsx` (tab strip: receipts + withdrawals) |
| Modify | `src/App.tsx` (real `/banca`, `/depositos` routes) |
| Delete (from PlaceholderPages) | `BancaPage`, `DepositosPage` wrappers |

---

### Task 2.1: `src/lib/payments.ts` + `format.ts` money helpers + `PAYMENT_METHODS` in `plans.ts`

Digest §1 (payments), §9 (formatMoney/formatBancaMoney), §5/§9 (PAYMENT_METHODS).

- [ ] **Step 1:** Create `src/lib/payments.ts`:
  - `export interface ReceiptFile { uri: string; mimeType: string; fileName: string; }` (browser: `uri` = file name/objectURL, keeps parity with mobile).
  - `export async function uploadReceipt(userId, receipt: ReceiptFile): Promise<{ url: string | null; error?: string }>` — adapt for browser `File`: build a `File` from the picker, derive `ext` from `fileName`, upload to `supabase.storage.from("payment-proofs")` path `${userId}/proof-${Date.now()}.${ext}` with the right `contentType`, then `getPublicUrl` → return `{ url: data.publicUrl }`; return `{ error }` on failure. Bucket is public.
- [ ] **Step 2:** In `src/lib/format.ts` add (port `mobile/src/core/format.ts:140-156`):
  - `formatMoney(n: number): string` → en-US `{minimumFractionDigits:2, maximumFractionDigits:2}`.
  - `formatBancaMoney(n: number, currency: "usd" | "aoa" = "usd"): string` → aoa: `Math.round(n).toLocaleString("pt-PT") + " Kz"`; usd: `"$" + formatMoney(n)`.
- [ ] **Step 3:** In `src/lib/plans.ts` add `PAYMENT_METHODS` (digest §5/§9 + mobile `lib/plans.ts`): array of `{ id: PaymentMethod; label; icon: string (lucide name); color; copyValue; getDetails: () => string (PT); usd: boolean; aoa: boolean }` — binance (usd only), rodotpay (usd+aoa), express (aoa only). Existing `BINANCE_ID`/`RODOTPAY_UID`/`EXPRESS_PHONE` already on web. Verify `PRICES`/`PLAN_PRICES` already present (Phase 1) — if not, add them now.
- [ ] **Step 4:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors; `npm run build` → PASS; `npx eslint src/lib/payments.ts src/lib/format.ts src/lib/plans.ts` → no errors.
- **Commit:** `feat(web): payments upload lib + money formatters + payment methods`

### Task 2.2: Extend `src/lib/adminApi.ts` (receipts + withdrawals)

Digest §2 (protocol + action table), §8 (types). Web `src/lib/adminApi.ts` already has the `admin-manage` POST helper + signals/boom functions + `uploadFile`. Keep its existing style.

- [ ] **Step 1:** Add types `PaymentReceipt` (id, user_id, user_email, proof_url, plan, method, amount, currency, status `'pending'|'approved'|'rejected'`, reviewed_by, reviewed_at, duplicate_of?, created_at) and `WithdrawalRequest` (id, user_id, method, amount, currency, details, status `'pending'|'approved'|'rejected'|'paid'`, reviewed_by, reviewed_at, notes, created_at).
- [ ] **Step 2:** Add functions calling the `admin-manage` edge fns: `listReceipts(status?, limit=50, offset=0)` → `{ receipts }`; `approveReceipt(id)`; `rejectReceipt(id)`; `deleteReceipt(id)`; `listWithdrawals(status?, limit, offset)` → `{ withdrawals }`; `approveWithdrawal(id)`; `rejectWithdrawalWithNotes(id, notes?)`; `markWithdrawalPaid(id)`.
- [ ] **Step 3:** Verification: tsc/build/eslint on `src/lib/adminApi.ts` → clean.
- **Commit:** `feat(web): adminApi receipt + withdrawal actions`

### Task 2.3: Hooks `useBanca` / `useCapitalAccount` / `useMovements` + `canAccessBanca`

Digest §3 (all three hooks + mobile useSubscription + realtime helper), §8 (schemas). Web uses `localStorage` (AsyncStorage), `crypto.randomUUID()` (expo-crypto), TanStack Query v5 + realtime `postgres_changes` invalidation (pattern already in `useSignals`/`useBoomHours`).

- [ ] **Step 1:** `src/hooks/useBanca.ts`: `BANCA_STORAGE_KEY = "banca_config"`, `BANCA_DEFAULTS` (all fields from `types.ts` `BancaConfig`), `useBanca()` → `{ config, loading, save(next)` } persisting to localStorage.
- [ ] **Step 2:** `src/hooks/useCapitalAccount.ts`: queries `["capital-account", user.id]` (`.maybeSingle()` on `capital_accounts`), `["capital-reports", user.id]` (`.order("created_at",{desc}).limit(52)` on `capital_reports`), realtime invalidation on both tables (filter `user_id=eq.<id>`), returns `{ account, reports, loading }`.
- [ ] **Step 3:** `src/hooks/useMovements.ts`: types `MovementType`/`MovementStatus`/`WalletMovement`; `MOVEMENTS_STORAGE_KEY = "wallet_movements"`; local-first merge (server ∪ local-only-by-id, desc, persist); `addMovement`/`deleteMovement`/`refresh` (optimistic + fire-and-forget direct insert/delete with RLS `user_id = auth.uid()`); `crypto.randomUUID()` for new ids; returns `{ movements, loading, addMovement, deleteMovement, refresh }`.
- [ ] **Step 4:** `useSubscription.ts`: add `canAccessBanca = tier === "premium"` to the returned `value` (mobile: `isPremium && planTier==='premium'`; equivalent on web). Optionally align the subscription query to `.order("updated_at",{ascending:false, nullsFirst:false}).limit(1)` (mobile pattern, survives duplicate rows) — only if it doesn't destabilize existing consumers; binary decision, note it in the report.
- [ ] **Step 5:** tsc/build/eslint on the 4 hook files → clean. Existing consumers (Analises/Planos/Navbar/Perfil) must keep compiling.
- **Commit:** `feat(web): banca/capital/movements hooks + canAccessBanca`

### Task 2.4: Capital components (web)

Digest §6. RN→web substitutions per digest §10 (input-file + navigator.clipboard + framer-motion + shadcn dialog/card/badge/button + lucide). PT hardcoded strings (Phase 1 precedent).

- [ ] **Step 1:** `src/components/banca/PaymentModal.tsx` (props from digest §6): method grid (2-col cards colored by method), selected method shows copyable payment value (`navigator.clipboard.writeText`, "Copiar" feedback), pay instructions, proof picker `<input type="file" accept="image/*">` with localStorage preview + fileName + remove, Cancel/`onConfirm(proof)` (busy spinner), auto-launch picker if Confirm pressed with no proof. Returns a `ReceiptFile`-shaped object (`{ uri, mimeType, fileName }`) for `uploadReceipt`.
- [ ] **Step 2:** `src/components/banca/ReceiptSuccessModal.tsx` (`{ open, onOpenChange }` — web-native instead of mobile `{ visible, onDone }`): animated check (framer-motion), "Comprovativo enviado", body msg, "Pendente" warning badge, hint, OK.
- [ ] **Step 3:** `src/components/banca/CapitalSimulatorCard.tsx` (`{ capital, currency="usd", strategy="conservador", onDeposit? }`): `STRATEGY_RETURN_PCT` (25/20/15), amount input (default `Math.round(capital)` when >0), Investido/Projetado rows (`amount*(1+pct/100)`), profit box, gold CTA disabled when `amount < 50` → `onDeposit(amount)`.
- [ ] **Step 4:** `src/components/banca/GrowthPlanSection.tsx` (`{ capital, currency="usd" }`): 3 strategy cards + projection card (investimento, retorno, período, lucro) + Activate; persists `growth_plan` (localStorage: `{planId, capital, activated}`) AND `useBanca().save({...config, planId})`; disabled + "Plano ativo" when activated.
- [ ] **Step 5:** tsc/build/eslint on the 4 component files → clean.
- **Commit:** `feat(web): capital UI components (payment/success/simulator/growth)`

### Task 2.5: Real `src/pages/Depositos.tsx`

Digest §5 (full flow) + §8 (RLS direct-client insert support) + §9. Replace the placeholder route in `App.tsx`.

- [ ] **Step 1:** Route params via `useSearchParams`: `plan?`, `currency?`, `amount?`. Sync external param changes into local state (`isCapitalDeposit = Number(amount) > 0` → locks into single capital deposit UI).
- [ ] **Step 2:** Deposit tab: currency segment (USD/AOA) → `availableMethods = PAYMENT_METHODS.filter(m => currency==='usd' ? m.usd : m.aoa)`; plan chips (Basic/Pro/Premium, hidden in capital mode); price via `PRICES[currency][plan]` / `PLAN_PRICES`. `hasPendingDepositRequest()` (server pending receipt count OR local pending deposit movement) enforced in modal open AND confirm.
- [ ] **Step 3:** `confirmDeposit`: `uploadReceipt(user.id, proof)` with 2 retries ×1.5s → `addMovement({type:'deposit', method, amount, currency, plan: isCapitalDeposit?'capital':plan, status:'pendente'})` → `saveReceipt({user_id, user_email, proof_url, plan: isCapitalDeposit?'capital':plan, method, amount, currency})` (direct insert with `referral_code` if known) → `ReceiptSuccessModal` + success toast.
- [ ] **Step 4:** Withdraw tab: method chips + `withdrawAmount` + `withdrawDetails` (placeholder = selected method `getDetails`); `submitWithdrawal(): validate → submitWithdrawalRequest({method, amount, currency, details}) → addMovement({type:'withdrawal', ..., status:'pendente', notes}) → clear + success feedback`.
- [ ] **Step 5:** Balance hero (gradient card, `formatBancaMoney(account?.achieved ?? config.achieved, cur)`, lock subtitle) + movement history list (arrow icons, method label, `formatShortDate`, signed amount, status Badge concluido/recusado/pendente, trash only for pending → `deleteMovement`).
- [ ] **Step 6:** Optional (cheap, parity): receipt inbox via localStorage (`payment_receipt_inbox`) on mount to resume an in-progress upload.
- [ ] **Step 7:** Update `PlaceholderPages.tsx` to remove `DepositosPage`; add real `<Depositos />` route in `App.tsx`; `Perfil` link stays.
- [ ] **Step 8:** tsc/build/eslint on changed/new files → clean.
- **Commit:** `feat(web): depositos page (receipt deposits + withdrawal requests)`

### Task 2.6: Real `src/pages/Banca.tsx`

Digest §4 (structure) + §8 (schemas). Premium gate with existing `@/components/signals/PremiumLock`.

- [ ] **Step 1:** Gate: `if (!loading && !subLoading && !canAccessBanca)` → `<PremiumLock title="Banca Premium" description="A gestão de capital é exclusiva do plano Premium." />` (a premium client NEVER sees the lock).
- [ ] **Step 2:** Data assembly (server source of truth, local config fallback): `capital`, `current`, `cur`, `totalWithdrawn`, `latestReport`; derived `profit`, `profitPct`, `isProfit`, `targetPct` (config.metaPercent, default 25), `targetValue`, `progressPct` (clamp), `walletDeposits`, `totalInvested = Math.max(walletDeposits, capital)`, `hasManagement`.
- [ ] **Step 3:** Inactive branch (no account/capital): hero (Depósito mínimo $50 + eyebrow +25%), "Como funciona" (3 passos), `CapitalSimulatorCard` with `onDeposit={(amount) => navigate('/depositos?amount='+amount+'&currency=usd')}`.
- [ ] **Step 4:** Active branch: hero GradientCard (current balance, mono, red if loss, deposited + signed profit/pct footer) → latest report card (period range, +x.x%, note) → stats grid (Investido/Lucro/Meta/Levantado) → progress card (bar at `progressPct`, +profit vs Meta target) → `CapitalSimulatorCard` (no onDeposit) → withdrawal card (Badge semanal + button per mobile — mobile only shows an alert; web: button shows a small info toast/dialog, real withdrawal lives in `/depositos`) → `GrowthPlanSection`.
- [ ] **Step 5:** Update `PlaceholderPages.tsx` to remove `BancaPage`; real `<Banca />` route in `App.tsx`.
- [ ] **Step 6:** tsc/build/eslint on changed/new files → clean.
- **Commit:** `feat(web): banca page (capital management)`

### Task 2.7: Admin receipts + withdrawals tabs

Digest §7 (panels) + §2 (actions). Web model: existing `src/components/admin/AdminSignalsTab.tsx` etc. Keep `src/pages/Admin.tsx` tab strip style and add 2 tabs.

- [ ] **Step 1:** `src/components/admin/AdminReceiptsTab.tsx`: fetch `listReceipts()`; summary cards (Pendentes/Aprovados/Rejeitados/Volume Σ approved); search via `useAdminSearch` over `['user_email','plan']`, filter chips by status; card rows with avatar initial, email/id, `timeAgo`+short date, status badge, "Possível duplicado" badge when `duplicate_of`, info grid PLANO/MÉTODO/VALOR (`formatBancaMoney`), "Comprovativo" as `<a href={proof_url} target="_blank" rel="noreferrer">`; pending → Aprovar/Rejeitar (confirm), non-pending → Eliminar.
- [ ] **Step 2:** `src/components/admin/AdminWithdrawalsTab.tsx`: `listWithdrawals()`; summary (Pendentes/Aprovados/Pagos/Volume Σ approved); searchFields `['method','currency']`, status chips incl. paid; item cards (method emoji/lucide, `currency.toUpperCase()`, `timeAgo`, status badge, `Number(amount).toFixed(2)` money via `formatBancaMoney`, details); pending → Aprovar/Rejeitar; approved → Marcar Pago (`markWithdrawalPaid`); rejected/paid read-only.
- [ ] **Step 3:** Wire into `src/pages/Admin.tsx` tab strip (`receipts`, `withdrawals`) mirroring existing tab components' loading/refresh patterns.
- [ ] **Step 4:** tsc/build/eslint on changed/new files → clean.
- **Commit:** `feat(web): admin receipts + withdrawals panels`

### Task 2.8: Phase 2 verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors; `npx tsc --noEmit` → 0.
- [ ] **Step 2:** `npm run build` → PASS.
- [ ] **Step 3:** eslint over all Phase 2 touched files → 0 errors.
- [ ] **Step 4:** dev server + Playwright smoke: `/planos` CTA → `/depositos?plan=premium&currency=usd` lands on Depositos with plan preselected; capital `amount` param → capital-lock mode; withdraw tab renders with methods per currency; `/banca` free user → PremiumLock; anonymous user → login prompt; admin email → `/admin` shows receipts+withdrawals tabs (data-limited smoke if no admin credentials).
- [ ] **Step 5:** Record results in this file under `Phase 2 verification results`.

---

## Risks

- **Edge function divergence:** root `supabase/functions/admin-manage` is older; deployed = mobile copy. If a capital admin action 404s, fall back to direct RLS queries for `capital_accounts`/`capital_reports` (select-own works). Phase 2 user flows never call capital admin actions.
- **Duplicate pending receipts:** DB partial unique index enforces one pending per user; mirror the UI check to avoid 23505.
- **`saveReceipt`/`submitWithdrawalRequest`/`wallet_movements` are direct client inserts** — replicate exactly; RLS allows own-row insert.
- Keep Phase 1 consumers compiling at every task boundary.