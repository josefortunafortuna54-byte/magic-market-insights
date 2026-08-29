# Web ↔ Mobile Parity — Implementation Plan (Master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the web app (Vite/React at repo root) to full feature parity with the Expo mobile app (`TMT/mobile`): multi-tier premium, SMC signal system, banca/capital, depósitos/saques com comprovativos, comunidade workspace (canais/DM/loja), admin completo (12 tabs), notificações, suporte IA, diário do trader, i18n e temas.

**Architecture:** The web and mobile already share the same Supabase instance (`zwxplzdadgtiohnuotlu/the-magic-trader`), the same tables (`signals`, `subscriptions`, `channels`, `conversations`, `messages`, `payment_receipts`, `withdrawal_requests`, `capital_accounts`, `capital_reports`, `wallet_movements`, `trade_journal`, `user_notifications`, `ai_quota`, `store_products`, `announcements`, `message_reports`, …) and the same Edge Functions (`admin-manage`, `close-signals`, `ai-support`, `send-notification`, …). No backend/schema work is required for parity. This plan ONLY ports the client logic from `mobile/src/` into the web `src/`, following the web's existing conventions: shadcn/ui components, TanStack Query, react-router-dom, `@/` alias. Ports are **data-logic ports** (types, hooks, helper functions re-implemented from the mobile modules), never RN imports.

**Tech Stack:** Vite 5 + React 18.3 + TypeScript + Tailwind 3.4 + shadcn/ui (Radix) + TanStack Query 5 + React Router DOM 6 + Supabase JS 2 + Framer Motion.

---

## Scope Check / Work Split

Full parity spans ~7 independent subsystems. This master plan splits the work into **6 phases + 1 final**. Each phase produces working, testable software on its own and is committed independently. Phase 1 (core/auth/pricing/signals) is fully detailed task-by-task below. Phases 2–6 are scoped here (files, components, acceptance criteria); each gets its own detailed sub-plan written immediately before execution.

**Order rationale (dependency-driven):**
1. Auth global + multi-tier premium unlock the gated screens (banca, comunidade, admin).
2. Banca/Depósitos depend on auth + plans/payment logic + admin approval.
3. Comunidade depends on auth + premium gating.
4. Admin completo consumes the data written by phases 2–3 (receipts, withdrawals, reports).
5. Suporte IA / Diário / misc are independent utilities.
6. i18n/temas are cross-cutting, so they land last (strings frozen after content settles).

### Migration map (mobile screen → web target)

| Mobile (mobile/src/app) | Web target (this repo) | Phase |
|---|---|---|
| `(tabs)/inicio.tsx` | Upgrade `pages/Index` dashboard cards (PerformanceCard, NextBoomCard, Channels, News, Announcements) | 1 + 3 |
| `(tabs)/analises.tsx` + `core/gating.ts` | Upgrade `pages/Analises` — SMC filters, multi-tier gating | 1 |
| `(tabs)/historico.tsx` | Upgrade `pages/Historico` (filtro por par) | 1 |
| `(tabs)/horarios.tsx` + `definicoes-booms.tsx` | Upgrade `pages/Horarios` + new `pages/DefinicoesBooms` | 1 + 5 |
| `(tabs)/perfil.tsx` | New `pages/Perfil` | 1 |
| `sinal/[id].tsx`, `sinal/chart/[id].tsx` | Upgrade `pages/SignalDetail` + new `pages/SinalChart` | 1 + 5 |
| `planos.tsx`, `depositos.tsx` | Rewrite `pages/Planos` + new `pages/Depositos` | 1 + 2 |
| `banca.tsx` | New `pages/Banca` | 2 |
| `comunidade/*` (9 screens) | New `/comunidade/*` routes | 3 |
| `(tabs)/admin.tsx` (12 tabs) | Expand `pages/Admin` | 2 + 4 |
| `notificacoes.tsx` | New `pages/Notificacoes` | 4 |
| `admin-gate.tsx` | New `pages/AdminGate` | 4 |
| `suporte-ia.tsx` | New `pages/SuporteIa` | 5 |
| `diario-trader.tsx` | New `pages/DiarioTrader` | 5 |
| `tema.tsx`, `idioma.tsx`, `_layout.tsx` i18n | New `pages/Tema`, `pages/Idioma`, i18n infra | 6 |
| `core/*.ts`, `lib/*.ts`, `services/*.ts` | Port to `src/lib/`, `src/hooks/`, `src/core/` (web) | per-phase |

---

## Conventions (apply to every phase)

- **Port, don't rewrite logic:** copy type/interfaces and helper behavior from `mobile/src/core/types.ts`, `mobile/src/core/*.ts`, `mobile/src/lib/*.ts`, `mobile/src/hooks/*.ts`. Re-skin UI with web shadcn components. Never `import` from `mobile/`.
- **Shared data contract:** web reads the SAME Supabase instance. Table/column names must match `mobile/supabase/migrations/*.sql` exactly (e.g. signals store `symbol`, `signal_type`, `entry_price`, `stop_loss`, `target_price`, `smc_setup`, `tier`, `risk_reward`, `expires_at`, `analysis`, `probability_score`).
- **Auth:** No component should call `supabase.auth.getUser()` ad-hoc. Use the global `AuthProvider` (created Phase 1).
- **Verification per phase:** `npm run lint` + `npm run build` must pass. Manually smoke-test the changed routes with the dev server (`npm run dev`) before declaring the phase done. Backend schema/Edge Functions are NOT modified unless explicitly stated.
- **No repo root git:** repo root is NOT a git repo (`.git` absent). If the user later initializes git, commits belong per-phase.
- **Not modifying:** do not touch `mobile/**`. Read from it only.

---

## Review

**Status: PASS** — initial review found 5 `minor` inaccuracies; all 5 were corrected in the plan (see findings below, now resolved in the file). For the record:

**Verified correct (spot-checked against source):** all `mobile/` ports referenced are real and named correctly — `core/gating.ts`, `core/types.ts`, `core/pips.ts`, `core/format.ts`, `core/community.ts` (BOT_USER_ID, REACTION_EMOJIS, FOREX_SYMBOLS, isUserOnline, isWeekendUtc, pairRoomState, PRESENCE_ONLINE_WINDOW_MS), `lib/plans.ts`, `lib/payments.ts`, `lib/userNotifications.ts`, `lib/realtime.ts`, `lib/aiSupport.ts`, `lib/adminGate.ts`, hooks in `mobile/src/hooks/` (useAuth, useSignals, useNotifications, useUnreadUserNotifications, useSubscription, useTradeJournal, etc.), `app/(tabs)/analises.tsx` (SMC_SETUPS), `app/suporte-ia.tsx` (STORAGE_KEY `tmt_ai_chat`, SUGGESTIONS), `app/definicoes-booms.tsx` (VOL_TIER_KEYS), the community/admin component trees, and migrations `20260816010000_community_search.sql` (RPC `search_messages`) and `20260822000000_admin_access_code_rpc.sql`. All web files claimed to modify exist (`src/hooks/useSubscription.ts`, `src/hooks/useSignals.ts`, `src/components/signals/SignalCard.tsx`, `src/pages/Planos.tsx`, `src/App.tsx`, `src/lib/admin.ts` with `isAdminEmail`, `src/lib/adminApi.ts` — which indeed lacks `saveReceipt`/`approveReceipt`/etc., correctly added in Phase 2), and all web files claimed to create (`perfil`, `banca`, `depositos`, `notificacoes`, etc.) are absent as claimed. Spec coverage is complete: auth, multi-tier premium, SMC, banca, depósitos/saques, comunidade, admin (12 tabs), notificações, suporte IA, diário, i18n, temas all map to a phase. Deps/ordering are sound; the `/depositos` reference in Phase 1 is resolved by the Task 1.12 placeholder. The SignalCard/useSignals/lib:types duplicate-`Signal` conflict is resolved coherently end-to-end (1.1 creates canonical type → 1.5 moves `useSignals` import → 1.6 removes the local interface).

**Findings (all fixed):**

1. **Fixed — Task 1.1 internal contradiction.** Step 1 no longer instructs deleting the local `Signal` interface early; deletion deferred to Task 1.6 after Task 1.5 moves the import.
2. **Fixed — Phase 4 RPC name.** Corrected to `verify_admin_access_code`.
3. **Fixed — Phase 6 language list.** Now matches mobile `languages.ts` exactly: `pt, en, es, fr, ja, ln, de, it, nl, zh, ko, ru, sw, ar`.
4. **Fixed — Dead auth/subscription paths.** Task 1.3/1.4 now reference `mobile/src/hooks/useAuth.tsx` and `mobile/src/hooks/useSubscription.ts`.
5. **Fixed — Task 1.9 `/depositos` note.** Now states placeholder arrives in Task 1.12.

**Informational (no change needed):** Task 1.4 Step 2 enumerates `Navbar`/`Comunidade`/`pages/Admin` as current `useSubscription` consumers, but grep shows only `Analises.tsx` and `Planos.tsx` currently import it; harmless since the step also instructs to `grep "useSubscription" src/` and update each real call site.

---

# PHASE 1 — Auth global, multi-tier premium, sistema SMC, planos por comprovativo

**Goal:** Web core matches mobile: global auth, 4-tier premium gating applied to signals, SMC fields end-to-end, planos rewritten to receipt-based payments. Produces: `/perfil`, upgraded `/analises`, `/historico`, `/planos`, `/signal/:id`, new `lib/types`, `lib/gating`, `lib/plans`, `lib/format`, `contexts/AuthContext`.

**Files summary**

| Action | Path |
|---|---|
| Create | `src/lib/types.ts` |
| Create | `src/lib/gating.ts` |
| Create | `src/lib/plans.ts` |
| Create | `src/lib/format.ts` |
| Create | `src/lib/pips.ts` |
| Create | `src/contexts/AuthContext.tsx` |
| Create | `src/hooks/useAuth.ts` |
| Create | `src/components/signals/PremiumLock.tsx` |
| Create | `src/components/signals/PlanUpsellModal.tsx` |
| Create | `src/components/layout/PagePlaceholder.tsx` |
| Modify | `src/hooks/useSubscription.ts` (rewrite multi-tier) |
| Modify | `src/hooks/useSignals.ts` (rewrite SMC fields) |
| Modify | `src/components/signals/SignalCard.tsx` |
| Modify | `src/components/layout/Navbar.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/pages/Analises.tsx` |
| Modify | `src/pages/Historico.tsx` |
| Modify | `src/pages/SignalDetail.tsx` |
| Modify | `src/pages/Planos.tsx` (rewrite) |
| Create | `src/pages/Perfil.tsx` |
| Create | `src/pages/PlaceholderPages.tsx` |
| Modify | `src/pages/Index.tsx` (dashboard cards) |
| Test | no new test infra (web has none); verify via `npm run lint` + `npm run build` + smoke test |

### Task 1.1: Create `src/lib/types.ts` (data contract)

Port these interfaces verbatim from `mobile/src/core/types.ts` (same field names/optionality): `SignalType`, `SignalStatus`, `SignalTier`, `BoomStatus`, `Signal` (incl. `tier`, `riskReward?`, `expiresAt?`, `analysis?`, `probabilityScore?`, `smcSetup?`), `HistorySignal`, `HistoryStats`, `Subscription` (with `plan?: string | null`, `currency?: string | null`, `stripe_price_id?: string | null`, `current_period_end?: string | null`), `BoomHour`, `BoomTime`, `BoomComment`, `BoomVote`, `PriceData`, `AppUser`, `BancaConfig`, `CapitalAccount`, `CapitalReport`, `TradeDirection`, `TradeResult`, `TradeEntry`, `TradeStats`, `Announcement`, `ChannelType`, `PairRoomState`, `Channel`, `Conversation`, `ConversationMember`, `UserProfile`, `MessageReaction`, `Message`, `NotificationType`, `AdminNotification`, `AdminPushToken`, `UserWithSubscription`.

- [ ] **Step 1:** Copy the type definitions above into `src/lib/types.ts`. (Keeps the canonical web `Signal` type. Do NOT delete the local `Signal` interface in `src/components/signals/SignalCard.tsx` yet — `useSignals.ts` still imports it and the build would break. That deletion happens in Task 1.6, after Task 1.5 moves the import.)
- [ ] **Step 2:** Run `npm run build`. Expected: PASS (SignalCard still exports its own interface; the new `lib/types.ts` is not yet referenced anywhere).

### Task 1.2: Create `src/lib/gating.ts` (plan limits + gating)

Port from `mobile/src/core/gating.ts` verbatim: `ALL_PAIRS`, `FREE_PAIRS`, `BASIC_PAIRS`, `TIMEFRAMES`, `FREE_TIMEFRAMES`, `BASIC_TIMEFRAMES`, `PRO_TIMEFRAMES`, `SIGNAL_TYPES`, `TV_INTERVALS`, `PLAN_LIMITS`, `PlanTier`, `isPremiumPair`, `isPremiumTimeframe`, `getPairGating`, `getTimeframeGating`, `canAccessPair`, `canAccessTimeframe`.

Also port these helpers from `mobile/src/core/pips.ts`: `getPipMultiplier(pair)` (JPY→100, XAU→100, BTC→1, else 10000), `calcPips`, `round1`. Put them in `src/lib/pips.ts`. Put the *formatters* from `mobile/src/core/format.ts` into `src/lib/format.ts`: `formatSymbol`, `formatTimeframe`, `formatType`, `timeAgo`, `formatLongDate`, `formatShortDate`, `formatMoney`, `decimalCountForPair`-equivalent used by Analises (`decimalsFor(pair)` → JPY 3, XAU/BTC 2, else 5).

- [ ] **Step 1:** Create `src/lib/gating.ts`, `src/lib/pips.ts`, `src/lib/format.ts`.
- [ ] **Step 2:** Run `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.3: Create `src/contexts/AuthContext.tsx` + `src/hooks/useAuth.ts`

Global auth context mirroring the mobile `useAuth` hook (`mobile/src/hooks/useAuth.tsx`). One provider, one listener.

- [ ] **Step 1:** Create `src/contexts/AuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2:** Create `src/hooks/useAuth.ts` re-exporting `useAuth` from the context file (`export { useAuth } from "@/contexts/AuthContext";`) so existing call sites can import from `@/hooks/useAuth`.
- [ ] **Step 3:** Run `npm run build`. Expected: PASS.

### Task 1.4: Rewrite `src/hooks/useSubscription.ts` (multi-tier)

Port the mobile tier-derivation logic (`mobile/src/hooks/useSubscription.ts` reading `subscriptions.plan`). Return `{ user, subscription, tier, currency, loading, isPremium (paid: basic|pro|premium), hasAnalysis, limits, canAccessPair(pair), canAccessTimeframe(tf) }`, with `tier: PlanTier` derived: `subscription?.status === "active" ? (subscription?.plan ?? "free") : "free"` (validate against `PLAN_LIMITS` keys; fallback `free`). Keep Stripe `checkout` only if it still exists server-side — otherwise remove it (Phase 1 payments move to receipts via `/depositos`).

- [ ] **Step 1:** Rewrite `src/hooks/useSubscription.ts`:

```ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, canAccessPair, canAccessTimeframe, type PlanTier } from "@/lib/gating";
import type { Subscription } from "@/lib/types";

const VALID_TIERS: PlanTier[] = ["free", "basic", "pro", "premium"];

async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single();
  return data ?? null;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => (user ? fetchSubscription(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 60_000,
  });

  const value = useMemo(() => {
    const active = subscription?.status === "active";
    const rawPlan = subscription?.plan ?? "free";
    const tier: PlanTier = active && VALID_TIERS.includes(rawPlan as PlanTier) ? (rawPlan as PlanTier) : "free";
    const isPremium = tier !== "free";
    const limits = PLAN_LIMITS[tier];
    const currency = (subscription?.currency as "usd" | "aoa") ?? "usd";
    return {
      user,
      subscription,
      tier,
      currency,
      loading: isLoading || (!user && false),
      isPremium,
      hasAnalysis: limits.hasAnalysis,
      limits,
      canAccessPair: (pair: string) => canAccessPair(pair, tier),
      canAccessTimeframe: (tf: string) => canAccessTimeframe(tf, tier),
    };
  }, [subscription, user, isLoading]);

  return value;
}
```

- [ ] **Step 2:** Update existing consumers of `useSubscription` (`Login`? no — consumers: `Navbar`, `Analises`, `Comunidade`, `Planos`, `pages/Admin`?) — search `grep "useSubscription" src/` and update each call site to the new API (replace `isPremium` checks with `tier`, `canAccessPair`, `canAccessTimeframe`). Remove the old `checkout` usages in `pages/Planos.tsx` (rewritten in Task 1.9).
- [ ] **Step 3:** `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.5: Rewrite `src/hooks/useSignals.ts` (SMC fields)

Extend `fetchSignals` mapping to include every new `Signal` field: `tier`, `riskReward` (from `risk_reward`), `expiresAt` (from `expires_at`), `analysis` (from `analysis`), `probabilityScore` (from `probability_score`), `smcSetup` (from `smc_setup`). Keep existing formatter logic; import `Signal` from `@/lib/types` (del duplicate defs).

- [ ] **Step 1:** Update mapping in `src/hooks/useSignals.ts` to the new fields and change the `Signal` import to `@/lib/types`.
- [ ] **Step 2:** `npm run build`. Expected: PASS.

### Task 1.6: Upgrade `src/components/signals/SignalCard.tsx`

- [ ] **Step 1:** Remove the local `Signal` interface; import from `@/lib/types`. Keep existing visuals.
- [ ] **Step 2:** Add: SMC setup badge (`smcSetup` from `SMC_SETUPS = ['BOS','CHoCH','OB','FVG','COMBO']`), probability badge (`probabilityScore`), tier badge (from `signal.tier`), expiry countdown when `expiresAt` present and status is active/pending. Add mobile prop `showAnalysis` (default false on cards; true in SignalDetail) + `analysisPreview` gated by `hasAnalysis`; when analysis exists but tier lacks it, show `<PremiumLock />` overlay instead of the text.
- [ ] **Step 3:** `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.7: Create `src/components/signals/PremiumLock.tsx` and `src/components/signals/PlanUpsellModal.tsx`

Port behaviors from `mobile/src/components/PremiumLock.tsx` and `mobile/src/components/PlanUpsellModal.tsx`. Web UI: `PremiumLock` = gold gradient lock (reuse existing `.badge-premium`/`--gradient-gold` styling) with CTA link to `/planos`. `PlanUpsellModal` = shadcn Dialog/Sheet listing 3 paid plans (`PLANS`, `PRICES` per `currency`) with "Subscrever" → `/planos`.

- [ ] **Step 1:** Create both components (shadcn: `dialog`, `badge`, `button` from `@/components/ui`).
- [ ] **Step 2:** `npm run build`. Expected: PASS.

### Task 1.8: Create `src/lib/plans.ts`

Port from `mobile/src/lib/plans.ts`: `Currency`, `PlanId`, `PaymentMethod`, `WA_GREEN`, `BINANCE_ID`, `RODOTPAY_UID`, `EXPRESS_PHONE`, `PAYMENT_METHODS` (keep `icon` as string name — web maps lucide `Bitcoin`/`CreditCard`/`Banknote` instead of Ionicons), `PLANS`, `PRICES`, `PLAN_PRICES`, `planLabel`. Drop `TFunction` deps (keep label strings pt-PT; i18n is Phase 6).

- [ ] **Step 1:** Create `src/lib/plans.ts` with lucide icon names.
- [ ] **Step 2:** `npm run build`. Expected: PASS.

### Task 1.9: Rewrite `src/pages/Planos.tsx` (4 plans + receipt flow)

- [ ] **Step 1:** Replace Stripe checkout flow with: 4 plan cards (Gratuito/Basic/Pro/Premium) from `PRICES` + currency toggle USD/AOA (mirror current page's currency selector + mobile `PRICES`); subscription CTA → `/depositos?plan=<id>&currency=<c>` (placeholder route created in Task 1.12; real page in Phase 2). Feature list per `PLAN_LIMITS` (pairs, timeframes, pushAlertsPerDay, hasAnalysis).
- [ ] **Step 2:** Remove `useSubscription().checkout` usage.
- [ ] **Step 3:** `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.10: Upgrade `src/pages/Analises.tsx` (SMC filters + multi-tier gating)

- [ ] **Step 1:** Import `SMC_SETUPS`-equivalent const (`['Todos','BOS','CHoCH','OB','FVG','COMBO']` from mobile `(tabs)/analises.tsx`), add SMC chip filter, `TIMEFRAMES`, `SIGNAL_TYPES`, `ALL_PAIRS` from `@/lib/gating`.
- [ ] **Step 2:** Apply `useSubscription()` tier gating to every pair/timeframe chip: locked ⇒ gold lock chip + `PremiumLock` CTA; keep weekend gating via `isWeekendUtc` helper (port from `mobile/src/core/community.ts`).
- [ ] **Step 3:** Use `decimalsFor(pair)` from `@/lib/format` for price display; [Implement decimalsFor]: `JPY<=3`, `XAU|BTC=>2`, else 5.
- [ ] **Step 4:** Add `PlanUpsellModal` trigger (as mobile) + refresh-button etc. remain.
- [ ] **Step 5:** `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.11: Upgrade `src/pages/SignalDetail.tsx` + `/historico`

- [ ] **Step 1:** `SignalDetail`: show `smcSetup`, `probabilityScore`, expiry, `analysis` gated by `hasAnalysis` (else `PremiumLock`), updated tiers. Keep TradingViewChart + reasons.
- [ ] **Step 2:** `Historico`: add pair filter select (from `ALL_PAIRS`), sorted; keep stats.
- [ ] **Step 3:** `npm run build`. Expected: PASS.

### Task 1.12: Create `src/pages/Perfil.tsx` + placeholder pages + routes

- [ ] **Step 1:** Create `src/pages/Perfil.tsx` — profile header (avatar letter/`displayName`/`contactInfo`, port from `mobile/src/core/format.ts`), `WalletCard` (Phase 2 data; render 0 values for now with "Em breve" for withdrawals), menu grid linking to: `/banca`, `/depositos`, `/notificacoes`, `/diario-trader`, `/suporte-ia`, `/definicoes-booms`, `/tema`, `/idioma`, `/admin` (admin only, `isAdminEmail` from `@/lib/admin`), logout via `useAuth().signOut`. Each row styled like a shadcn `Card` with lucide icon + chevron.
- [ ] **Step 2:** Create `src/components/layout/PagePlaceholder.tsx` (title + "Disponível em breve" + back) and `src/pages/PlaceholderPages.tsx` exporting `<BancaPage/>, <DepositosPage/>, <NotificacoesPage/>, <SuporteIaPage/>, <DiarioTraderPage/>, <DefinicoesBoomsPage/>, <TemaPage/>, <IdiomaPage/>` wrappers (each renders PagePlaceholder). These are replaced in later phases.
- [ ] **Step 3:** In `src/App.tsx`: wrap tree with `<AuthProvider>` (inside `QueryClientProvider`); add routes: `/perfil` (Perfil), `/banca`, `/depositos`, `/notificacoes`, `/diario-trader`, `/suporte-ia`, `/definicoes-booms`, `/tema`, `/idioma` (placeholders). Keep existing routes.
- [ ] **Step 4:** `Navbar.tsx`: add "Perfil" nav item (desktop+mobile) linking `/perfil` and show tier badge (e.g. `PRO`, `PREMIUM`) next to user menu when `useSubscription().tier !== 'free'`.
- [ ] **Step 5:** `npm run lint` + `npm run build`. Expected: PASS.

### Task 1.13: Upgrade `src/pages/Index.tsx` dashboard cards

- [ ] **Step 1:** Add the mobile home cards that fit web home: `NextBoomCard` (next boom from `useBoomHours` — query `boom_hours`), `PerformanceCard` (winRate from `useHistory`). Reuse `src/components/` patterns. Keep existing hero.
- [ ] **Step 2:** `npm run build`. Expected: PASS.

### Task 1.14: Phase 1 verification

- [ ] **Step 1:** `npm run lint` — Expected: 0 errors.
- [ ] **Step 2:** `npm run build` — Expected: PASS (dist generated).
- [ ] **Step 3:** `npm run dev` and smoke-test: `/login` → email login; `/analises` shows SMC filter chips, locked pair/timeframe chips render gold locks for a free user, a pro-only signal card shows PremiumLock on analysis; `/planos` shows 4 plans + currency toggle; `/perfil` opens, menu links work, logout works; `/historico` pair filter works.
- [ ] **Step 4:** Record results in this plan file under `Phase 1 verification results`.

---

# PHASE 2 — Banca (gestão de capital) + Depósitos/Saques com comprovativo

**Goal:** Web gets `/banca` and `/depositos` (deposit via receipt upload, withdraw request), plus `WalletCard` data. Admin receives receipts/withdrawals panels (start of admin overhaul).

**Files:**
- Create `src/lib/payments.ts` — port `mobile/src/lib/payments.ts` (`uploadReceipt`, `ReceiptFile`, bucket `payment-proofs`);
- Create `src/hooks/useBanca.ts`, `useCapitalAccount.ts`, `useMovements.ts` (port mobile hooks; tables `capital_accounts`, `capital_reports`, `wallet_movements`);
- Create `src/components/capital/PaymentModal.tsx`, `ReceiptSuccessModal.tsx`, `CapitalSimulatorCard.tsx`, `GrowthPlanSection.tsx`, `WalletCard.tsx`;
- Create `src/pages/Banca.tsx`, real `src/pages/Depositos.tsx` (tabs deposit|withdraw, `PAYMENT_METHODS`, `PLANS`, `PLAN_PRICES`, upload receipt, `saveReceipt`, `submitWithdrawalRequest`);
- Modify `src/lib/adminApi.ts` — add `saveReceipt`, `approveReceipt`, `rejectReceipt`, `deleteReceipt`, `submitWithdrawalRequest` (call same Edge Function `admin-manage` action names as mobile `src/lib/adminApi.ts`);
- Modify `src/pages/Admin.tsx` — add `ReceiptsPanel` + `WithdrawalsPanel` tabs (port from `mobile/src/components/admin/`);
- Update `/depositos?plan=&currency=` to preselect plan from `/planos` link;

**Blockers:** none (auth + plans from Phase 1). Placeholders `/banca`, `/depositos` get replaced.

**Acceptance criteria:** free user without `canAccessBanca` sees lock on `/banca`; user can upload a receipt for a plan; admin sees it in ReceiptsPanel and approves/rejects; approved → subscription active with plan; withdrawals list shows in admin WithdrawalsPanel; `npm run lint`/`build` pass.

---

# PHASE 3 — Comunidade workspace completa (Slack-like) + loja

**Goal:** `/comunidade` becomes the full workspace: feed|workspace toggle, canais, DMs 1:1, salas de pares, pesquisa de mensagens, perfis públicos, loja.

**Files:**
- Hooks (port from `mobile/src/hooks/`): `useChannels`, `useConversations`, `useProfiles`, `useMessages`, `useMessageSearch`, `useStoreProducts`; realtime via `lib/realtime` pattern (`mobile/src/lib/realtime.ts` `subscribeToChanges`);
- Components (web equivalents of `mobile/src/components/community/*.tsx`): `CommunityFeed`, `CommunityHero`, `WorkspaceSection`, `ChannelCard`, `ChannelRow`, `ChannelPickerModal`, `DmRow`, `PairRoomCard`, `PairRoomRow`, `MessageList`, `MessageBubble`, `Composer`, `UserAvatar`, `BoomMessage`; helpers from `mobile/src/core/community.ts` (`BOT_USER_ID`, `REACTION_EMOJIS`, `FOREX_SYMBOLS`, `isUserOnline`, `isWeekendUtc`, `pairRoomState`, `PRESENCE_ONLINE_WINDOW_MS`);
- Routes: `/comunidade` (upgrade), `/comunidade/canais/:channelId`, `/comunidade/dm/:conversationId`, `/comunidade/pesquisa`, `/comunidade/novo-canal`, `/comunidade/novo-dm`, `/comunidade/user/:userId`, `/comunidade/loja`;
- `AdminComunidadeTab` extended in Phase 4;
- Emoji reactions, message search via RPC `search_messages` (mobile migration `20260816010000_community_search.sql`), share-signal via RPC `share_signal` (skip on web if no feed insertion path — keep RPC available).

**Acceptance criteria:** authenticated user sees `#geral #sinais #duvidas #resultados #off-topic` channels; opening a channel streams messages in realtime; can post text+image; reacts with emoji; DM flow works; new channel creation gated (premium/admin); loja shows products from `store_products`; search finds messages.

---

# PHASE 4 — Admin completo (12 tabs) + central de notificações + admin-gate

**Goal:** `/admin` matches mobile admin panel (dashboard, signals, boom, boom_times, posts, users, receipts, withdrawals, messaging, reports, channels, announcements) with bulk actions; web gets notifications center `/notificacoes` and admin access flow `/admin-gate`.

**Files:**
- Port admin components from `mobile/src/components/admin/*`: `BulkActionsBar`, `SearchBar`, `FilterChips`, `PairChips`, `QuickChips`, `SessionPresets`, `ConfidencePresets`, `SignalTypeToggle`, `TimePresets`, `ExportButton`, `SkeletonList`, `UserDetailModal`, `Toast`, `NotificationBadge`, `NotificationListModal`, `MessagingPanel`, `ReportsPanel`, `ChannelsPanel`, `AnnouncementsPanel`, `ReceiptsPanel`, `WithdrawalsPanel` (receipts/withdrawals authored in Phase 2);
- Hooks: `useAdminBulkActions`, `useAdminAlerts`, `useAdminSearch` (mobile hooks);
- `/admin` page: 12-tab layout; `MessagingPanel` uses Edge Function `send-notification` for push (web: shows admin→user message list + plan-request approvals — no device push; keep parity where meaningful);
- `/notificacoes`: `useNotifications` + `user_notifications` (`fetchUserNotifications`, `markAllUserNotificationsRead`, `deleteUserNotification`, `getPlanRequests` — port from `mobile/src/lib/userNotifications.ts` + `lib/planRequests.ts`);
- `/admin-gate`: `unlockAdmin`/`verifyAdminCode` from `mobile/src/lib/adminGate.ts` (RPC `verify_admin_access_code`), then redirect `/admin`;
- Port `useUnreadUserNotifications` for a nav badge.

**Acceptance criteria:** admin email user opens `/admin-gate` → enters code → `/admin` with 12 tabs; can approve/reject receipts+withdrawals (written in Phase 2), bulk-close signals, view reports, announce; non-admin sees nothing. Notification center groups plan requests + read/unread notifications.

---

# PHASE 5 — Suporte IA, Diário do Trader, horários avançados, sinal chart

**Goal:** Remaining utility screens: `/suporte-ia` (AI assistant w/ quota), `/diario-trader` (calendar journal), `/definicoes-booms` (boom prefs), `/sinal/:id/chart` (fullscreen TradingView), `AlarmToggle`, economic calendar on `/horarios`.

**Files:**
- `src/pages/SuporteIa.tsx` — port `mobile/src/app/suporte-ia.tsx` (`askAssistant` from `lib/aiSupport.ts` calls Edge Function `ai-support`, `STORAGE_KEY='tmt_ai_chat'`, `SUGGESTIONS`, quota feedback);
- `src/pages/DiarioTrader.tsx` — port calendar + `AddTradeModal` + `useTradeJournal` (table `trade_journal`), `TradeStatsSummary`, ExportButton;
- `src/pages/DefinicoesBooms.tsx` — port boom prefs (`VOL_TIER_KEYS`, load/save/apply prefs, `requestNotificationPermission` → web Notification API already used in Horarios);
- `src/pages/SinalChart.tsx` — fullscreen TradingViewChart route `/analises/:id/chart`; premium lock behavior;
- `src/components/AlarmToggle.tsx` (web), economic calendar `useEconomicCalendar`/`EconomicEventBadge` (port `services/economicCalendar.ts`); plug into `/horarios`;

**Acceptance criteria:** each new route renders and integrates gating/LiveQuantities; quota exceeded → theme-informed lock; calendar entries saved and listed; booms prefs persist in localStorage; `npm run lint`/`build` pass.

---

# PHASE 6 — i18n (14 idiomas) + temas light/dark/system + onboarding

**Goal:** Web supports mobile's 14 languages and light/dark/system theme toggle; all UI strings extracted; onboarding tour + AI FAB parity where sensible.

**Files:**
- Install/configure `i18next` + `react-i18next` (same as mobile `lib/i18n/*`); port `mobile/src/lib/i18n/languages.ts`;
- `src/pages/Idioma.tsx` (list of 14 languages, persists choice in localStorage);
- `src/pages/Tema.tsx` (`system|light|dark` via existing `next-themes`; mobile `ThemeMode`);
- Extract strings into `public/locales/<code>/translation.json` for the exact mobile set — `pt, en, es, fr, ja, ln, de, it, nl, zh, ko, ru, sw, ar` (from `mobile/src/lib/i18n/languages.ts`) — strings exported from the mobile `pt` source for consistency;
- `OnboardingTour` (web), `AiFab` (web), `PremiumCapitalCredit`/`PremiumWelcomeModal` on first load;
- Final lint/build + full smoke test of every route.

**Acceptance criteria:** language switcher changes UI instantly; theme toggle persists + applies to shadcn variables (ensure light palette added to `index.css` `:root`/`.light`); onboarding shows once; all routes render in each language without missing keys.

---

## Risks / Notes

- **Scope size:** full parity is large. Each phase ships standalone; the plan explicitly defers sub-plans for Phases 2–6. When starting a phase, write its detailed task plan (this format) first, then execute.
- **No web test infra:** verification = ESLint + production build + manual smoke via Playwright/dev browser. Adding Vitest is out of scope unless requested.
- **No repo-root git:** commit/rollback strategy must be user-defined; recommend `git init` at root before Phase 1 execution.
- **Backend already has everything:** no schema/Edge Function edits expected. If a RPC/column is missing on the web-connected project, flag it (do not silently adapt).
- **Mobile untouched:** never edit `mobile/**`.