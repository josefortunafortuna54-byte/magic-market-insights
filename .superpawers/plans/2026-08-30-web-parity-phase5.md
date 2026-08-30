# Web ↔ Mobile Parity — Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the remaining utility screens to the web at parity with mobile: `/suporte-ia` (AI assistant with quota), `/diario-trader` (trader journal calendar), `/definicoes-booms` (boom preferences, premium-gated), `/horarios` upgrade (boom-prefs filtering + `AlarmToggle` + economic calendar), and `/analises/:id/chart` (fullscreen TradingView chart with premium gating).

**Architecture:** Port the client logic from `mobile/src/**` into web `src/**` following the existing web conventions (shadcn/ui, TanStack Query, react-router-dom, `@/` alias, hardcoded PT literals, commit per task on `master`). Data-logic ports only — never RN/Expo imports; AsyncStorage → `localStorage`, expo-notifications → web `Notification` API (interval-based scheduler, documented degraded parity), `Alert`/`Share`/`Modal` → shadcn Dialog/toast/download. No backend/schema/Edge Function edits; the `ai-support` and `economic-calendar` external APIs are called exactly like mobile.

**Tech Stack:** Vite 5 + React 18.3 + TypeScript + Tailwind 3.4 + shadcn/ui + TanStack Query 5 + React Router DOM 6 + Supabase JS 2. TradingView advanced-chart embed (existing web `TradingViewChart`).

**Dependency order:** 5.1 `lib/aiSupport` + `/suporte-ia` → 5.2 `useTradeJournal` + `AddTradeModal` + `/diario-trader` → 5.3 `lib/boomPrefs` + `/definicoes-booms` → 5.4 `/horarios` upgrade (`AlarmToggle` + `lib/notifications` + economic calendar) → 5.5 `/analises/:id/chart` → 5.6 verification. Each task is self-contained and gates-green on its own.

---

## Conventions (from master plan + Phases 1–4)

- **Port, don't rewrite:** copy types/interfaces/behavior from `mobile/src/**`. Re-skin UI with web shadcn. Never `import` from `mobile/`, never edit `mobile/**`. If a listed RPC/col/table is missing on the web-connected project, FLAG it — do not silently adapt.
- **Shared data contract:** same Supabase instance/tables (`trade_journal`, `ai_quota`, `boom_hours`, `subscriptions`, `signals`, …). Column names match `mobile/supabase/migrations/*.sql`.
- **Auth:** use `useAuth()` global context. Edge-function calls attach `Authorization: Bearer <session.access_token>` (from `supabase.auth.getSession()`), `apikey: VITE_SUPABASE_ANON_KEY` (same value mobile uses via `SUPABASE_ANON_KEY`).
- **PT strings:** hardcoded PT-PT literals (no web i18n layer; Phase 6 adds i18n). Copy EXACT mobile literals (quoted verbatim in each task from `mobile/src/lib/i18n/locales/pt.json`).
- **Gates per task:** `npx tsc --noEmit -p tsconfig.app.json` → 0; `npx tsc --noEmit` → 0; `npm run build` → PASS; `npx eslint <changed files>` → 0 errors (warnings OK).
- **Commit:** one `feat(web):` / `fix(web):` commit per task on `master`.
- **No test infra:** verification = gates + Playwright smoke (Task 5.6).
- **Env var:** add `VITE_FOREX_CALENDAR_KEY` to `.env` (may be empty; keep `.env` untracked). Matches mobile `EXPO_PUBLIC_FOREX_CALENDAR_KEY`.

---

# Task 5.1: `src/lib/aiSupport.ts` + `/suporte-ia` (AI chat with quota)

**Files:**
- Create: `src/lib/aiSupport.ts`
- Create: `src/pages/SuporteIa.tsx`
- Modify: `src/App.tsx` (route `/suporte-ia` → `<SuporteIa />`)
- Modify: `src/pages/PlaceholderPages.tsx` (remove `SuporteIaPage` placeholder)
- Modify: `src/pages/Perfil.tsx` (menu row "Suporte IA" already links to `/suporte-ia` — verify/keep)

Port `mobile/src/lib/aiSupport.ts` + `mobile/src/app/suporte-ia.tsx`.

- [ ] **Step 1:** Create `src/lib/aiSupport.ts`:

```ts
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface AiMessage {
  role: "user" | "model";
  text: string;
}

export interface AiResult {
  reply: string;
  error: string | null;
  remainingChat?: number;
  remainingImage?: number;
}

const AI_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support`;

const QUOTA_ERRORS: Record<string, string> = {
  auth_required: "Inicia sessão para usares o assistente de IA.",
  quota_daily_chat: "Atingiste o limite diário do teu plano. Faz upgrade para continuares a conversar.",
  quota_daily_image: "As análises de imagem requerem um plano pago. Faz upgrade no separador Planos.",
  quota_plan_image: "As análises de imagem requerem um plano pago. Faz upgrade no separador Planos.",
  quota_burst: "Muitos pedidos seguidos. Aguarda alguns minutos e tenta de novo.",
};

function mapError(data: { error?: unknown; code?: unknown }): string {
  if (data && typeof data.code === "string" && QUOTA_ERRORS[data.code]) return QUOTA_ERRORS[data.code];
  if (data && typeof data.error === "string" && data.error) return data.error;
  return "Erro ao contactar o suporte. Tenta novamente.";
}

async function callAi(payload: Record<string, unknown>): Promise<AiResult> {
  const { data } = await supabase.auth.getSession();
  const session: Session | null = data.session;
  if (!session?.access_token) {
    return { reply: "", error: "Inicia sessão para usares o assistente de IA." };
  }
  let res: Response;
  try {
    res = await fetch(AI_FN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { reply: "", error: "Erro de ligação. Verifica a tua internet e tenta novamente." };
  }
  let dataJson: Record<string, unknown>;
  try {
    dataJson = await res.json();
  } catch {
    dataJson = {};
  }
  if (!res.ok || dataJson.error) {
    return { reply: "", error: mapError(dataJson) };
  }
  const reply = typeof dataJson.reply === "string" ? dataJson.reply : "";
  if (!reply) {
    return { reply: "", error: "A IA não devolveu uma resposta." };
  }
  return {
    reply,
    error: null,
    remainingChat: typeof dataJson.remainingChat === "number" ? dataJson.remainingChat : undefined,
    remainingImage: typeof dataJson.remainingImage === "number" ? dataJson.remainingImage : undefined,
  };
}

export async function askAssistant(messages: AiMessage[]): Promise<AiResult> {
  return callAi({ messages: messages.slice(-20) });
}
```

Note: mirror mobile exactly (slice −20, single POST, one-shot, no streaming).

- [ ] **Step 2:** Create `src/pages/SuporteIa.tsx` — port `mobile/src/app/suporte-ia.tsx` (no RN imports):
  - `STORAGE_KEY = "tmt_ai_chat"`; load on mount from `localStorage` (JSON.parse, `Array.isArray`, validator `isAiMessage(m)` = `!!m && typeof m.text === "string" && (m.role === "user" || m.role === "model")`, `.slice(-40)`); persist on every `messages` change.
  - State: `messages: AiMessage[]`, `input`, `sending`, `error: string | null`, `remaining: number | null`.
  - `send()`: append user msg, `setSending(true)`, `await askAssistant(next)`; on `result.error` → `setError(result.error)` (error banner in destructive color — quota exceeded surfaces here, no modal); on success append `{ role: "model", text: result.reply }` and `setRemaining(result.remainingChat ?? null)`.
  - `clearChat()`: `setMessages([])`; `setError(null)`.
  - UI (`<Layout>`): header "Suporte IA" + subtitle "Assistente The Magic Trader" + "Limpar conversa" button; welcome block "Olá, sou o assistente do TMT 👋" / "Tiro dúvidas sobre sinais, planos, alertas, banca e a app." when no messages; message bubbles (user = primary/green aligned right, model = secondary/card aligned left); typing row with spinner while `sending`; suggestion chips when no messages — exact literals: "Como funcionam os planos?", "O que é a Hora do Boom?", "Como ativo os alarmes?", "Como gero a minha banca?" (tap → send that as user message); counter line "Mensagens restantes hoje: {remaining}" when `remaining !== null`; bottom input (placeholder "Escreve a tua pergunta…") + "Enviar" button (disabled while `sending` or empty).
- [ ] **Step 3:** `src/App.tsx`: swap route `/suporte-ia` to `<SuporteIa />` (import from `./pages/SuporteIa`); remove `SuporteIaPage` from the `PlaceholderPages.tsx` import set. In `src/pages/PlaceholderPages.tsx` delete the `SuporteIaPage` export.
- [ ] **Step 4:** Gates: the 4 commands above on `src/lib/aiSupport.ts`, `src/pages/SuporteIa.tsx`, `src/App.tsx`, `src/pages/PlaceholderPages.tsx`.
- [ ] **Step 5:** Commit: `feat(web): AI support chat screen (suporte-ia) with quota`.

---

# Task 5.2: `useTradeJournal` + `AddTradeModal` + `/diario-trader` (trader journal)

**Files:**
- Create: `src/hooks/useTradeJournal.ts`
- Create: `src/components/journal/AddTradeModal.tsx`
- Create: `src/pages/DiarioTrader.tsx`
- Modify: `src/lib/pips.ts` (add signed `pipSize`/`calcPips` from mobile `src/lib/pairPrice.ts`)
- Modify: `src/App.tsx` (route `/diario-trader` → `<DiarioTrader />`)
- Modify: `src/pages/PlaceholderPages.tsx` (remove `DiarioTraderPage`)

Port `mobile/src/hooks/useTradeJournal.ts` + `mobile/src/components/AddTradeModal.tsx` + `mobile/src/app/diario-trader.tsx`. Types `TradeEntry`/`TradeStats`/`TradeDirection`/`TradeResult` ALREADY exist in `src/lib/types.ts` — import from there, do not redeclare.

- [ ] **Step 0:** Extend `src/lib/pips.ts`: append (do not change existing exports) a port of `pipSize(pair)` and signed `calcPips(pair, direction, entry, exit)` verbatim from `mobile/src/lib/pairPrice.ts:13-19,34-45` (BUY→`exit-entry`, SELL→`entry-exit`, scaled by `pipSize(pair)`). Used by `AddTradeModal`. Gate: `tsc` on this file at next boundary.

- [ ] **Step 1:** Create `src/hooks/useTradeJournal.ts` — port mobile hook:
  - `STORAGE_KEY = "trade_journal"`; `localStorage` cache = AsyncStorage.
  - `genId()`: `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`.
  - `toRow(trade: TradeEntry, userId: string)` → the camelCase→snake cols (`pair, direction, entry_price, exit_price, lot_size, result, profit_usd, pips, notes, boom_hour_id, created_at, closed_at, synced_at`) and `fromRow(row)` → `TradeEntry` (mirror mobile exactly).
  - Load: read `localStorage["trade_journal"]` instantly (empty array fallback), then `supabase.from("trade_journal").select("*").order("created_at", { ascending: false })`, merge server-wins + local-only, write back. On any error keep local data.
  - `persist(updater)` diffs added/updated/removed; write localStorage (fire-and-forget) and mirror to Supabase: `upsert` (`onConflict: "id"`) for added, `update().eq("id").eq("user_id")` per updated, `delete().in("id")` for removed.
  - Returns `{ trades, loading, stats, todayPnl, weekPnl, addTrade, removeTrade, updateTrade }`:
    - `addTrade(entry: Omit<TradeEntry, "id" | "createdAt"> & { createdAt?: string })` → genId, default `createdAt` ISO now, prepend.
    - `removeTrade(id)`, `updateTrade(id, patch)`.
    - `stats` (`TradeStats`): `totalTrades, wins, losses, breakevens, winRate (wins/closed×100, closed = result !== "BREAKEVEN"), totalPnl, avgWin, avgLoss (abs), profitFactor (grossProfit/grossLoss; Infinity when 0 loss but profit), bestTrade, worstTrade, totalPips`.
    - `todayPnl` (createdAt.slice(0,10) === today), `weekPnl` (>= week-ago string).
- [ ] **Step 2:** Create `src/components/journal/AddTradeModal.tsx` (shadcn `Dialog`, matching mobile `AddTradeModal`):
  - Props: `{ open, onClose, onSave(entry) }` where `onSave` payload exact mobile shape: `{ pair; direction: TradeDirection; entryPrice: number; exitPrice: number|null; lotSize: number; result: TradeResult; profitUsd: number; pips: number; notes: string; boomHourId: string|null; closedAt: string|null }`.
  - Fields: pair chips from `ALL_PAIRS.filter(p => p !== "BTC/USD")` (from `@/lib/gating`); direction buttons BUY/SELL; result buttons WIN/LOSS/BREAKEVEN (aria labels from `TradeResult`); inputs Preço Entrada (`tradeEntry`), Preço Saída (`tradeExit`), Lucro (USD) (`tradeProfit`), Lote (opcional) (`tradeLot`, default "0.01"), Notas textarea (placeholder `tradeNotesPlaceholder` = "Ex: Segui sinal do boom hour...").
  - Pips: auto-calc when both prices present via a **new signed calcPips** (created in Step 0 above): `pips = calcPips(pair, direction, entry, exit)` (signed: BUY→exit−entry, SELL→entry−exit, scaled by `pipSize(pair)`, ported from `mobile/src/lib/pairPrice.ts` — do NOT reuse the existing web 5-arg history `calcPips(entry, tp, sl, status, symbol)`). Allow manual override edit (`pipsAuto` note "Pips calculados automaticamente" shown before manual edit). Omit the live current-price line (cosmetic divergence, documented in Risks).
  - Validation: `profitUsd` must be finite → `toast.error("Valor inválido")` with description `tradeInvalidProfit` = "Introduz o lucro/perda da operação." Buttons: Cancelar / Guardar (disabled until pair+entry present). On save always `{ boomHourId: null, closedAt: new Date().toISOString() }`.
- [ ] **Step 3:** Create `src/pages/DiarioTrader.tsx` — port mobile diary (calendar grid):
  - `WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]`; `getMonthDays(year, month)` → day numbers with leading `null` padding (static helpers in-file).
  - Headers: title `diario.title` = "Diário de Trader", subtitle `diario.subtitle` = "Regista e acompanha as tuas operações dia a dia.", "Registar" button (opens AddTradeModal), `ExportButton` (`label={diario.exportCsv}` = "Exportar CSV", `filename="tmt-diario"`, columns `[Data,Par,Direção,Entrada,Saída,Lotes,Resultado,PnL (USD),Pips,Notas]` — "Data" and "PnL (USD)" match mobile `diario-trader.tsx:136-145` exactly), mapped over `trades` in mobile key order.
  - Calendar: month label via `new Date(y, m).toLocaleString("pt-PT", { month: "long", year: "numeric" })` (web standardizes on `pt-PT` — mobile uses `pt-AO`, month names match in practice; documented in Risks); prev/next arrows; dayCell = day number + colored dot (green +pnl / red −pnl / faint 0; accent halo on today); selected day opens its trades list below. `dayCell` width `1/7`.
  - Selected-day list: `TradeRow` card (direction icon arrow-up/arrow-down/remove → lucide `ArrowUp`/`ArrowDown`/`Minus`; `result` colors success/destructive/muted; pair, direction, entry→exit, lotSize, result, profitUsd (+USD), pips, notes) with trash button → `window.confirm(diario.deleteTradeConfirm)` = "Tem certeza que quer apagar esta operação?" → `removeTrade`. NO deletion toast (existing `pt.json` `diario.delete` = "Apagar" is only the mobile confirm-button label, not a toast). Empty state `diario.noTrades` = "Sem operações neste dia" + hint `diario.noTradesHint` = "Toca em 'Registar' para adicionar a primeira operação do dia.".
  - Month stats row (3 boxes): `diario.monthTrades`="Operações no mês", `diario.monthWinRate`="Win Rate", `diario.monthPnl`="P&L do mês" (month-filtered like mobile `monthTrades/monthWins/monthPnl`).
  - Save flow: modal `onSave` → `addTrade({ ...entry, createdAt: \`${selectedKey}T12:00:00.000\` })` (selectedKey = `selected date's YYYY-MM-DD`; matches mobile diario-trader.tsx:334-337).
  - Note: mobile `TradeStatsSummary.tsx` is dead code (not imported on mobile) — NOT ported (YAGNI).
- [ ] **Step 4:** `src/App.tsx`: route `/diario-trader` → `<DiarioTrader />`; remove `DiarioTraderPage` from imports/placeholder file.
- [ ] **Step 5:** Gates on the 4 changed/new files.
- [ ] **Step 6:** Commit: `feat(web): trader journal (diario-trader) with calendar and CSV export`.

---

# Task 5.3: `src/lib/boomPrefs.ts` + `/definicoes-booms`

**Files:**
- Create: `src/lib/boomPrefs.ts`
- Create: `src/lib/notifications.ts` (minimal `requestNotificationPermission()`; full scheduler added in Task 5.4)
- Create: `src/pages/DefinicoesBooms.tsx`
- Modify: `src/App.tsx` (route `/definicoes-booms` → `<DefinicoesBooms />`)
- Modify: `src/pages/PlaceholderPages.tsx` (remove `DefinicoesBoomsPage`)

Port `mobile/src/lib/boomPrefs.ts` + `mobile/src/app/definicoes-booms.tsx`.

- [ ] **Step 0:** Create `src/lib/notifications.ts` with `requestNotificationPermission(): Promise<boolean>` (web `Notification` API; `false` when unsupported) — the alarm scheduler/sender is added in Task 5.4 Step 1.

- [ ] **Step 1:** Create `src/lib/boomPrefs.ts` — verbatim port (AsyncStorage → localStorage):
  - `type VolTier = "todas" | "alta" | "media" | "baixa";`
  - `interface BoomPrefs { pairs: string[]; volTier: VolTier; hiddenIds: string[]; }`
  - `DEFAULT_BOOM_PREFS: BoomPrefs = { pairs: [], volTier: "todas", hiddenIds: [] };`
  - `VOL_TIERS = [{key:"todas"},{key:"alta"},{key:"media"},{key:"baixa"}]` (order drives chip order).
  - `VOL_RANGE: Record<VolTier, [number, number]> = { todas:[1,5], alta:[4,5], media:[2,3], baixa:[1,2] };`
  - `loadBoomPrefs(userId?: string): Promise<BoomPrefs>` → key `` `boom_prefs_${userId ?? "guest"}` ``; JSON.parse + validate (volTier vs VOL_RANGE keys; fallback `DEFAULT_BOOM_PREFS` on any error/missing).
  - `saveBoomPrefs(prefs: BoomPrefs, userId?: string): void` → `localStorage.setItem(key, JSON.stringify(prefs))`.
  - `applyBoomPrefs(hours: BoomHour[], prefs: BoomPrefs): BoomHour[]` — remove `hiddenIds`, filter by `prefs.pairs` when non-empty (intersect `h.pairs`), sort: in-tier-volatility first then descending `volatility`. (Vol tier does NOT hide windows — ordering only, per mobile comment.)
  - `hasActiveFilters(prefs: BoomPrefs): boolean` (`pairs.length>0 || hiddenIds.length>0`); `collectBoomPairs(hours: BoomHour[]): string[]` (sorted unique pair list).
  - `import type { BoomHour } from "@/lib/types";`
- [ ] **Step 2:** Create `src/pages/DefinicoesBooms.tsx` — port mobile screen:
  - Hooks: `useAuth()` (`user`), `useSubscription()` (`isPremium, tier, loading`), `useBoomHours()` (`booms, loading`).
  - Premium gate: `const premium = isPremium && tier === "premium";` if `!premium` → `<Layout>` + `<PremiumLock title="Personalização Premium" description="Filtra os booms por tendência, pares e volatilidade." />` (existing web `PremiumLock` props `{title, description}`).
  - State `prefs`, load via `loadBoomPrefs(user?.id)` on `user?.id` change; `update(patch)` = merge + `saveBoomPrefs` (fire-and-forget); `reset()` = `update(DEFAULT_BOOM_PREFS)`.
  - `visibleCount = applyBoomPrefs(booms, prefs).length` → `"{visible} de {total} booms visíveis no teu horário."`.
  - Volume chips: `VOL_TIERS` with labels "Todas"/"Alta"/"Média"/"Baixa", active = `prefs.volTier`, onSelect `update({ volTier })`; hint `volHint` = "As janelas do nível escolhido aparecem primeiro. Todos os BOOMs activos continuam sempre visíveis."
  - Pair chips: "Todos" chip (active when `pairs.length===0`, resets `pairs: []`) + one chip per `collectBoomPairs(booms)`; `togglePair` membership. Hint `pairsHint` = "Só vês booms com estes pares". Empty `noPairs` = "Nenhum par associado aos booms."
  - "Filtrar booms" section: each `booms` row a `Switch` (shadcn) `checked={!hidden}`, `onCheckedChange={() => toggleHidden(id)}`, hidden rows `opacity-50 line-through`; labels `filterBooms`="Filtrar booms", `filterDesc`="Oculta janelas que não queres ver", `reset`="Repor predefinições".
  - Alarms card (m7: rendered ABOVE/OUTSIDE the premium gate, like mobile `definicoes-booms.tsx:96-109` — free users must see it): `alarmsTitle`="Alarmes & Notificações", `alarmsDesc`="Recebe avisos 5 minutos antes de cada janela de alta volatilidade.", "Ativar" button → `requestNotificationPermission()` from `src/lib/notifications.ts` (created in Task 5.4 Step 1; for THIS task create that file with just `requestNotificationPermission()` and import it — do NOT inline the permission flow).
  - Loading states: "A carregar definições…" / "A carregar booms…". No `hoursError` branch (web `useBoomHours` has no `error` field — only `loading`; on failure it just returns empty, per its implementation — document, don't add a phantom branch).
  - Wrap in `<Layout>`, header title "Definições do Boom".
- [ ] **Step 3:** `src/App.tsx` route swap + remove `DefinicoesBoomsPage` from `PlaceholderPages.tsx`.
- [ ] **Step 4:** Gates.
- [ ] **Step 5:** Commit: `feat(web): boom preferences screen (definicoes-booms)`.

---

# Task 5.4: `/horarios` upgrade — prefs filtering + `AlarmToggle` + economic calendar

**Files:**
- Create: `src/lib/notifications.ts` (web notification helper — port subset of `mobile/src/lib/notifications.ts`)
- Create: `src/components/AlarmToggle.tsx`
- Create: `src/lib/economicCalendar.ts` (port `mobile/src/services/economicCalendar.ts`)
- Create: `src/hooks/useEconomicCalendar.ts`
- Create: `src/components/economics/EconomicEventBadge.tsx` (badge + `EconomicEventsRow`, port `mobile/src/components/EconomicEventBadge.tsx`)
- Modify: `src/pages/Horarios.tsx` (prefs filter + AlarmToggle + news rows + gear/filters link)
- Modify: `.env` (optional, untracked: add `VITE_FOREX_CALENDAR_KEY=` — empty OK)

Ports from `mobile/src/lib/notifications.ts`, `mobile/src/components/AlarmToggle.tsx`, `mobile/src/services/economicCalendar.ts`, `mobile/src/hooks/useEconomicCalendar.ts`, `mobile/src/components/EconomicEventBadge.tsx`, and the assets of `mobile/src/app/(tabs)/horarios.tsx`.

- [ ] **Step 1:** Create `src/lib/notifications.ts` (web; extend the Task 5.3 file, keep `requestNotificationPermission` as-is):
  - `boomEpochMs(now: Date, timeWAT: string): number` — port VERBATIM from `mobile/src/core/booms.ts` (mobile passes this to `AlarmToggle`; web has no equivalent helper today). `timeWAT` is a plain `"HH:MM"` string — never feed `"HH:MM"` straight into `new Date()` (Invalid Date → NaN → alarms never fire, M1).
  - Alarm registry in `localStorage["boom_alarms"]` (shape `Array<{ identifier: string; boomId: string; warningId?: string; fired?: boolean }>`): `loadAlarmEntries`, `saveAlarmEntries`, `getBoomAlarm(boomId)`. **Migration (m4):** existing web `Horarios.tsx` persists `boom_alarms` as `Record<string, boolean>` (object map, `Horarios.tsx:62-63,112-114`). On load, if the parsed value is NOT an array → silently clear (`localStorage.removeItem` / return `[]`) — do NOT try to reconcile shapes.
  - `scheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean>`: `if (!(await requestNotificationPermission())) return false;` then register entry with `fired: false`; ACTUAL firing is interval-based (web limitation): a module-level `setInterval` every 5 s checks registered alarms; **past-window guard (M1):** `const boomDate = new Date(boomTime); const warningAt = boomDate.getTime() - 5*60*1000; if (boomDate.getTime() - now <= 0 || warningAt - now <= 0) return false;` (mirror mobile `notifications.ts:161`). Fire `new Notification(...)` warning at `warningAt` and exact blow at `boomDate`; store `fired` marker. Only fires while a tab is open — documented degraded parity (same as current web Horarios behavior).
  - `cancelBoomAlarm(boomId)`, `getBoomAlarm(boomId)`. Keep module shared so `AlarmToggle` and the `/horarios` scheduler use ONE registry.
  - Notification copy (m8) — use the EXACT mobile literals from `mobile/src/lib/notifications.ts:186,217`: prep title = `"A Hora do Boom aproxima-se"` (body: name + "começa em 5 minutos" equivalent), go title = `"HORA DO BOOM! 🚨"`. If the current web `Horarios.tsx` already shows different literals, REPLACE them for parity — do not keep conflicting copy.
- [ ] **Step 2:** Create `src/components/AlarmToggle.tsx` — port mobile:
  - Props `{ boomId: string; boomTime: string; title: string }`. Self-managed `armed`, `busy` (init true), `blocked`.
  - Init: `getBoomAlarm(boomId).then(alarm => { setArmed(!!alarm); setBusy(false); })`.
  - Toggle: armed → `await cancelBoomAlarm(boomId); setArmed(false)`; else → `const ok = await scheduleBoomAlarm(boomId, boomTime, title); ok ? setArmed(true) : setBlocked(true)`; busy guard.
  - UI: `busy` → spinner; else button: armed state (`BellRing` icon + "Notificação ativa" + hint "Notificamos-te 5 min antes.") / idle (`Bell` icon + "Ativar notificação"); blocked state (`BellOff` + "Notificações bloqueadas — ativa nas definições do sistema." destructive).
- [ ] **Step 3:** Create `src/lib/economicCalendar.ts` (port mobile service):
  - `API_KEY = import.meta.env.VITE_FOREX_CALENDAR_KEY ?? ""`; `BASE = "https://api.forex-calendar.pro/api"`.
  - `type ImpactLevel = "high" | "medium" | "low" | "holiday";`
  - `interface EconomicEvent { date; time; currency; impact: ImpactLevel; event; actual; forecast; previous; originalTime; timezone }` (all strings except `impact`; actual/forecast/previous nullable strings).
  - `request<T>(path)` → `null` when no API key; `fetch(BASE+path, { headers: { "X-API-Key": API_KEY } })`; `null` on !ok/catch.
  - `fetchTodayEvents()`: `/announcements?impact=high,medium`; `fetchWeekEvents()`: `/announcements/week?impact=high,medium`.
  - `CURRENCY_MAP` (EUR/USD, GBP/USD, USD/JPY, AUD/USD, EUR/GBP, USD/CHF, NZD/USD, USD/CAD, XAU/USD→["USD","XAU"], BTC/USD→["USD"]) + `eventsForPair(events, pair)`.
  - `eventsNearBoom(events, boomTimeWAT, boomPairs, windowMinutes=60)` — parse "HH:MM" (am/pm +720/−720 logic from mobile), compare minutes, filter currency∩set AND |Δ|≤window. Export `eventsNearBoom` and `CURRENCY_MAP`.
- [ ] **Step 4:** Create `src/hooks/useEconomicCalendar.ts`:
  - Returns `{ today: EconomicEvent[], week: EconomicEvent[], loading, newsForBoom(boomTimeWAT, boomPairs) }`.
  - On mount: `Promise.all([fetchTodayEvents(), fetchWeekEvents()])` → `today = r?.events ?? []`, `week = ...`; poll every 5 min (`setInterval` with active guard/cleanup, like mobile).
  - `newsForBoom = (t, p) => eventsNearBoom(today, t, p, 60)`.
  - react-query NOT required (matches mobile interval polling); wrap with `useMemo` for `newsForBoom` bound to `today`.
- [ ] **Step 5:** Create `src/components/economics/EconomicEventBadge.tsx`:
  - `EconomicEventBadge({ event })`: impact color map `high:#FF453A (→ text-red-500/rose), medium:#FF9F0A (→ amber), low:#34C759 (→ green), holiday:#98989D (→ gray)`; lucide icon per impact (`AlertOctagon`/`AlertTriangle`/`Info`/`Calendar`) with tailwind colors; renders `{event.currency} — {event.event}` + `{event.time}`; if `event.forecast` an "F" column; if `event.actual` an "A" column.
  - `EconomicEventsRow({ events })`: `null` when empty; else section title hardcoded "Notícias Económicas" (mobile hardcodes it too) + mapped badges (key `${e.currency}-${e.event}-${i}`).
- [ ] **Step 6:** Modify `src/pages/Horarios.tsx`:
  - **Hours source (M2):** switch `Horarios` from its inline `supabase.from("boom_hours").select("*").limit(10)` fetch (`Horarios.tsx:69-80`) to `useBoomHours()` — the hook field is **`booms`**, NOT `hours`. Use `booms` as the input to `applyBoomPrefs`. (Alternatively keep the inline fetch and pass `boomHours`; but use `useBoomHours()` for consistency with Task 5.3.)
  - Load prefs: `useAuth().user`, `loadBoomPrefs(user?.id)` on mount; `const filteredHours = useMemo(() => applyBoomPrefs(booms, prefs), [booms, prefs]);`; `hiddenCount = Math.max(0, booms.length - filteredHours.length)`; `filtersActive = hasActiveFilters(prefs)`.
  - Section header gear (or settings) button → `/definicoes-booms`; when `filtersActive` show banner `horarios.filtersActive` = `"Filtros ativos · {{count}} boom(s) oculto(s)"` (**middle dot `·`**, pt.json:125, NOT an em dash; substitute `{{count}}` → `${hiddenCount}`) (clickable → `/definicoes-booms`); when `filteredHours.length === 0` show `noFilteredBooms`="Sem booms nos filtros" + `noFilteredBoomsDesc`="Nenhum boom corresponde aos teus filtros. Ajusta-os nas definições." + "Ajustar filtros" button.
  - Replace the current inline alarm toggle with `<AlarmToggle boomId={h.id} boomTime={new Date(boomEpochMs(new Date(), h.time_wat)).toISOString()} title={h.title} />` for each non-expired card. (M9: there is NO hero next-boom card in web `Horarios` — flat list + clock + tip; each row card gets an `AlarmToggle`, nothing else changes.) Keep the existing denied-permission warning banner (`notifPermission === "denied"`).
  - Economic calendar: `const { newsForBoom } = useEconomicCalendar();` pass `newsForBoom(h.time_wat, h.pairs)` into each card body → `<EconomicEventsRow events={...} />` below the pairs/badge line.
  - Keep existing WAT/GMT clock, live dot, statuses, descriptions, tip card.
- [ ] **Step 7:** Gates on all created/modified files. `.env`: add `VITE_FOREX_CALENDAR_KEY=` (empty line) if absent (keep untracked).
- [ ] **Step 8:** Commit: `feat(web): horarios prefs filter, alarm toggle, economic calendar`.

---

# Task 5.5: `/analises/:id/chart` — fullscreen TradingView chart with gating

**Files:**
- Create: `src/pages/SinalChart.tsx`
- Modify: `src/App.tsx` (add route `/analises/:id/chart` — IMPORTANT: declare BEFORE `/analises/:id` is not needed with v6 ranking; place after `/analises/:id`)
- Modify: `src/pages/SignalDetail.tsx` (add "Gráfico completo" button → `/analises/:id/chart`)

Port the chart/gating behavior from `mobile/src/app/sinal/chart/[id].tsx` onto the EXISTING web `TradingViewChart` (web: `embed-widget-advanced-chart.js`, no level shapes — accepted reverse-parity gap).

- [ ] **Step 1:** Create `src/pages/SinalChart.tsx`:
  - `useParams<{ id }>`; `useQuery({ queryKey: ["signal", id], queryFn: async () => fetch signal by id from `signals` (`.eq("id", id).maybeSingle()`), map row → `Signal` via `formatSymbol/formatTimeframe/formatType`, plus `smcSetup`, `entry`, `stopLoss`, `takeProfit`, `confidence`, reasons, createdAt; status "active" (mobile hardcodes) , enabled: !!id })`.
  - Gating (mobile `[id].tsx:81-98`): `const { tier, loading: subLoading } = useSubscription();` (m1: web hook exposes `loading`, not `subLoading` — rename in destructure, same pattern as `SignalDetail.tsx`); `allUnlocked = subLoading || tier === "pro" || tier === "premium"`; **`const limits = PLAN_LIMITS[allUnlocked ? "premium" : tier] ?? PLAN_LIMITS.free;`** (M3 — mobile derives it this way; both `PLAN_LIMITS` ([@/lib/gating]) and a `limits` field on `useSubscription()` exist — use the explicit `PLAN_LIMITS` derivation to match mobile); `pairNorm = pair.replace(/[^A-Za-z]/g, "")`; `pairAllowed = limits.pairs.some(p => p.replace(/[^A-Za-z]/g, "") === pairNorm)`; `tfAllowed = signal.timeframe === "Todos" || limits.timeframes.includes(signal.timeframe)`; if `!allUnlocked && (!pairAllowed || !tfAllowed)` → `<PremiumLock title={`${signal.pair} ${signal.timeframe}`} description="Desbloqueia todos os pares e timeframes com o plano PRO." />` + "Fechar" button (`navigate(-1)`).
  - Chart: `<TradingViewChart symbol={signal.pair} interval={TV_INTERVALS[signal.timeframe ?? "M15"] ?? "15"} height="100vh" />` in a full-bleed container; absolute top-left overlay header showing `{pair} · {timeframe}` + close (`X`) button routed `navigate(-1)`; page uses `<Layout noFooter />` (check how other admin-less full pages use Layout; otherwise plain div with own header). Add loading "A carregar análise…" and not-found "Sinal não encontrado" (from `sinal.*` literals — reuse existing `src/pages/SignalDetail.tsx` copy style).
- [ ] **Step 2:** `src/App.tsx`: add `<Route path="/analises/:id/chart" element={<SinalChart />} />` (order after `/analises/:id` is fine — v6 ranks static segments higher).
- [ ] **Step 3:** `src/pages/SignalDetail.tsx`: add a "Gráfico completo" button (lucide `Maximize2`) near the chart caption linking to `/analises/${id}/chart` (web adaptation of mobile's hero-card chart tap).
- [ ] **Step 4:** Gates on the 3 files.
- [ ] **Step 5:** Commit: `feat(web): fullscreen trading chart route with premium gating`.

---

# Task 5.6: Phase 5 verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0; `npx tsc --noEmit` → 0.
- [ ] **Step 2:** `npm run build` → PASS.
- [ ] **Step 3:** eslint over all Phase 5 touched files → 0 errors (list them at run time: `src/lib/aiSupport.ts`, `src/lib/boomPrefs.ts`, `src/lib/notifications.ts`, `src/lib/economicCalendar.ts`, `src/hooks/useTradeJournal.ts`, `src/hooks/useEconomicCalendar.ts`, `src/pages/SuporteIa.tsx`, `src/pages/DiarioTrader.tsx`, `src/pages/DefinicoesBooms.tsx`, `src/pages/Horarios.tsx`, `src/pages/SinalChart.tsx`, `src/pages/SignalDetail.tsx`, `src/components/AlarmToggle.tsx`, `src/components/journal/AddTradeModal.tsx`, `src/components/economics/EconomicEventBadge.tsx`, `src/App.tsx`, `src/pages/PlaceholderPages.tsx`).
- [ ] **Step 4:** dev server + Playwright smoke (anonymous/free user):
  - `/suporte-ia` → renders header "Suporte IA", welcome copy, 4 suggestion chips, input; no console errors.
  - `/diario-trader` → calendar renders with current month, "Registar" button opens AddTradeModal, empty-day state copy.
  - `/definicoes-booms` → free user sees `PremiumLock` ("Personalização Premium").
  - `/horarios` → clock + boom cards render; alarm toggle present (works or shows blocked when Notification denied); no crash with empty `VITE_FOREX_CALENDAR_KEY` (econ feed hidden).
  - `/analises/:id/chart` with an existing signal id → renders fullscreen chart (or PremiumLock for a locked pair/TF); back works.
  - Console: 0 app errors (external-resource warnings OK).
- [ ] **Step 5:** Record results in this file under `Phase 5 verification results`.

---

## Risks / Notes

- **Economic calendar key:** `EXPO_PUBLIC_FOREX_CALENDAR_KEY` mobile → `VITE_FOREX_CALENDAR_KEY` web. Empty key ⇒ feed silently hidden (mobile returns empty too). Depends on an external paid APIFootball/forex-calendar source; if the key is missing or the hostname 404s, `request<T>` returns `null` → `[]` — verified graceful.
- **Alarm parity (degraded):** web cannot schedule OS-level notifications; keeps the existing interval-based model (fires only while a tab is open) — same limitation as the current web Horarios. Documented, do not build a service-worker fallback (out of scope).
- **TradingView level shapes:** mobile draws entry/SL/TP horizontal lines; the existing web embed window doesn't. Reverse parity gap — documented, not in scope.
- **TradeStatsSummary dead code:** mobile component not imported anywhere; NOT ported (YAGNI).
- **AddTradeModal pips autofill:** mobile uses a live `fetchPairPrice`; web omits the live price line and uses the NEW signed `calcPips(pair, direction, entry, exit)` ported from `mobile/src/lib/pairPrice.ts` (web's existing 5-arg history `calcPips` is NOT used) — cosmetic divergence on the live-price hint only, no behavior regression.
- **Locale:** web standardizes on `pt-PT` for date/month formatting (mobile uses `pt-AO`); month names match in practice — cosmetic divergence, documented.
- **No per-route auth gating** exists on web (only `AdminGuard` on `/admin`); `/suporte-ia` shows the `aiErrors.auth` banner when logged out (mobile behavior) — no new route guards added.
- Keep Phases 1–4 consumers compiling at every task boundary (esp. `Horarios`, `SignalDetail`, `App.tsx`, `PlaceholderPages.tsx`).
- Never touch `mobile/**`; never create RPCs/migrations.

---

## Review

**Reviewer verdict: `ISSUES_FOUND` → all corrections APPLIED → `APPROVED`** (re-evaluation after fixes behind the editor/author).

- B1 (blocker): web `calcPips` is a 5-arg history fn; true signed journal pips come from `mobile/src/lib/pairPrice.ts`. → Fixed: Task 5.2 Step 0 ports `pipSize` + signed `calcPips`; AddTradeModal calls `(pair, direction, entry, exit)`.
- M1: alarm `boomTime` must be full ISO via `boomEpochMs` (web had no helper) + past-window guard. → Fixed Task 5.4 Steps 1 & 6.
- M2: `Horarios` uses inline fetch, hook field is `booms` not `hours`. → Fixed Task 5.4 Step 6 (use `useBoomHours()` → `booms`).
- M3: `limits` derivation unspecified → added `PLAN_LIMITS[...] ?? PLAN_LIMITS.free` in Task 5.5.
- m1 `subLoading` rename; m2 `·` middle dot literal; m3 no deletion toast (`diario.delete` = "Apagar"); m4 `boom_alarms` shape migration; m5 CSV cols "Data"/"PnL (USD)"; m6 `pt-PT` standardize; m7 alarms card outside premium gate + no phantom `hoursError` branch; m8 use mobile notification literals (`"A Hora do Boom aproxima-se"` / `"HORA DO BOOM! 🚨"`); m9 no hero card — row cards only. All applied verbatim.

Verified strengths: TradeEntry/TradeStats types, useTradeJournal port spec, AddTradeModal payload, aiSupport QUOTA_ERRORS/slice(−20)/headers, boomPrefs verbatim, PremiumLock/TradingViewChart/Layout props, Perfil links, v6 route ranking all confirmed correct against source.