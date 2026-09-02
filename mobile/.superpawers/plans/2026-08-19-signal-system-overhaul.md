# Signal System Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all critical flaws in the TMT trading signal generation system — correct data sources, add rule-based validation, implement backtesting, create feedback loops, and produce a specialist technical document.

**Architecture:** Replace Frankfurter daily-only forex data with Twelve Data intraday OHLC, fix XAU/USD to use real gold data, add a rule-based technical confirmation layer that filters Gemini LLM output, implement signal outcome tracking with backtesting, enforce expiry in close-signals, and add spread/slippage buffers.

**Tech Stack:** Deno/TypeScript (Supabase Edge Functions), PostgreSQL (migrations + pg_cron), React Native/Expo (client-side analytics), Twelve Data API (intraday forex+gold), Binance API (crypto), Google Gemini (LLM analysis)

---

## File Structure

### Files to Modify
| File | Changes |
|------|---------|
| supabase/functions/generate-crypto-signals/index.ts | Replace Frankfurter with Twelve Data, fix XAU, add rule-based validation, add spread buffer, improve expiry logic |
| supabase/functions/close-signals/index.ts | Use Twelve Data for forex intraday prices, enforce expires_at |
| supabase/functions/admin-manage/index.ts | Add smc_setup, analysis, expires_at to manual signal creation |
| src/core/types.ts | Add SignalOutcome, Analytics types |
| src/hooks/useHistory.ts | Add per-pair, per-timeframe analytics |
| src/components/PerformanceCard.tsx | Add per-pair breakdown |

### Files to Create
| File | Purpose |
|------|---------|
| supabase/migrations/20260819000000_signal_outcomes.sql | Signal outcomes tracking + analytics RPCs |
| supabase/migrations/20260819000001_enforce_expiry_cron.sql | Cron job to expire old signals |
| src/components/AnalyticsBreakdown.tsx | Per-pair/timeframe analytics component |
| SIGNAL_SYSTEM_SPECIALIST.md | Technical document for analysis specialists |

---

## Task 1: Fix XAU/USD Data Source

**Problem:** generate-crypto-signals/index.ts:139-153 fetches EUR/USD from Frankfurter and treats it as gold. This is completely wrong data.

**Solution:** Use Twelve Data API for XAU/USD OHLC candles on the server side.

### Files:
- Modify: supabase/functions/generate-crypto-signals/index.ts:130-168

- [ ] **Step 1: Add Twelve Data API key as Supabase Edge Function secret**

Run in terminal (requires supabase CLI linked to project):
`
supabase secrets set TWELVE_DATA_KEY=582dd606f65345be9fc3596b218fd610
`

- [ ] **Step 2: Add Twelve Data OHLC fetch function after line 128**

`	ypescript
// ── Twelve Data: forex + gold OHLC (intraday) ──────────────────────────────

const TWELVE_DATA_KEY = Deno.env.get('TWELVE_DATA_KEY') ?? '';

const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  XAUUSD: 'XAU/USD', EURGBP: 'EUR/GBP', USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD',
};

async function fetchTwelveDataOHLC(symbol: string, interval = '1h', outputsize = 48): Promise<Candle[]> {
  const tdSymbol = TWELVE_DATA_SYMBOLS[symbol];
  if (!tdSymbol || !TWELVE_DATA_KEY) throw new Error(Twelve Data:  not mapped or no key);
  const res = await fetch(
    https://api.twelvedata.com/time_series?symbol=&interval=&outputsize=&apikey=,
  );
  if (!res.ok) throw new Error(Twelve Data : );
  const data = await res.json();
  if (data.status === 'error') throw new Error(Twelve Data: );
  const values: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume: string }> = data?.values ?? [];
  if (!values.length) throw new Error(Twelve Data: no data for );
  return values.reverse().map((v) => ({
    o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), v: Number(v.volume),
  }));
}
`

- [ ] **Step 3: Replace fetchCandles function (lines 172-179)**

`	ypescript
async function fetchCandles(symbol: string): Promise<Candle[]> {
  const norm = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (norm === 'BTCUSDT' || norm === 'BTCUSD') return fetchBinanceKlines('BTCUSDT');
  if (norm === 'ETHUSDT' || norm === 'ETHUSD') return fetchBinanceKlines('ETHUSDT');
  // Forex: try Twelve Data first (intraday), fallback to Frankfurter (daily)
  if (TWELVE_DATA_KEY && TWELVE_DATA_SYMBOLS[norm]) {
    try { return await fetchTwelveDataOHLC(norm, '1h', 48); }
    catch (e) { console.warn(Twelve Data failed for , fallback Frankfurter: ); }
  }
  const config = FOREX_PAIR_CONFIG[norm];
  if (config) return fetchFrankfurterForex(config.base, config.quote);
  throw new Error(Par desconhecido: );
}
`

- [ ] **Step 4: Remove broken XAU special case in fetchFrankfurterForex (lines 139-153)**

Replace the entire fetchFrankfurterForex function:

`	ypescript
async function fetchFrankfurterForex(base: string, quote: string): Promise<Candle[]> {
  if (base === 'XAU') throw new Error('Frankfurter does not support XAU. Use Twelve Data.');
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const s = start.toISOString().split('T')[0];
  const e = end.toISOString().split('T')[0];
  const res = await fetch(https://api.frankfurter.app/..?from=&to=);
  if (!res.ok) throw new Error(Frankfurter );
  const data = await res.json();
  const rates = data?.rates;
  if (!rates || typeof rates !== 'object') throw new Error('Frankfurter: sem dados');
  const dates = Object.keys(rates).sort();
  const closes = dates.map((d) => Number(rates[d]?.[quote]));
  if (closes.length < 2) throw new Error('Frankfurter: dados insuficientes');
  return closes.map((c, i) => {
    const prev = i > 0 ? closes[i - 1] : c;
    const next = i < closes.length - 1 ? closes[i + 1] : c;
    return { o: prev, h: Math.max(prev, c, next), l: Math.min(prev, c, next), c, v: 0 };
  });
}
`

- [ ] **Step 5: Commit**

`ash
git add supabase/functions/generate-crypto-signals/index.ts
git commit -m "fix: replace Frankfurter with Twelve Data for XAU/USD gold + intraday forex"
`
"@

Set-Content -Path C:\Users\Luar Studio Angola\Desktop\DEV\TMT\mobile\.superpawers\plans\2026-08-19-signal-system-overhaul.md -Value  -Encoding UTF8
Write-Host "Part 1 written successfully"

---

## Task 2: Fix close-signals Intraday Prices + Enforce Expiry

**Problem:** close-signals uses Frankfurter /latest (daily close). expires_at never enforced.

### Files: Modify supabase/functions/close-signals/index.ts

- [ ] Step 1: Add Twelve Data price fetching after line 74
- [ ] Step 2: Replace fetchCurrentPrice to prefer Twelve Data
- [ ] Step 3: Add expiry enforcement after TP/SL check
- [ ] Step 4: Commit

## Task 3: Rule-Based Technical Confirmation Layer

**Problem:** Gemini LLM is sole decision-maker. Need deterministic rule-based filter.

### Files: Modify supabase/functions/generate-crypto-signals/index.ts

- [ ] Step 1: Add validateSignalTechnical() after buildSnapshot
- [ ] Step 2: Add spread buffer functions
- [ ] Step 3: Integrate tech validation into signal pipeline
- [ ] Step 4: Apply spread buffer in rows mapping
- [ ] Step 5: Commit

## Task 4: Fix Signal Expiry Logic

**Problem:** All signals expire at next 05:00 UTC regardless of timeframe.

### Files: Modify supabase/functions/generate-crypto-signals/index.ts

- [ ] Step 1: Replace nextExpiry with timeframe-aware version
- [ ] Step 2: Pass timeframe to nextExpiry in rows mapping
- [ ] Step 3: Commit

## Task 5: Create Signal Outcomes Tracking

### Files: Create supabase/migrations/20260819000000_signal_outcomes.sql

- [ ] Step 1: Create signal_outcomes table + indexes + RLS
- [ ] Step 2: Create analytics RPCs (pair, timeframe, SMC setup, equity curve)
- [ ] Step 3: Commit

---

## Task 4: Fix Signal Expiry Logic

**Problem:** All signals expire at next 05:00 UTC regardless of timeframe.

### Files: Modify supabase/functions/generate-crypto-signals/index.ts

- [ ] Step 1: Replace nextExpiry (lines 98-111) with timeframe-aware version

`	ypescript
function nextExpiry(now: Date, timeframe: string): string {
  const d = new Date(now);
  const tf = timeframe.toUpperCase();
  if (isWeekendUtc(now)) {
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
    d.setUTCHours(5, 0, 0, 0);
    return d.toISOString();
  }
  switch (tf) {
    case 'M15': d.setUTCHours(d.getUTCHours() + 4); break;
    case 'M30': d.setUTCHours(d.getUTCHours() + 6); break;
    case 'H1': d.setUTCHours(d.getUTCHours() + 12); break;
    case 'H4': d.setUTCDate(d.getUTCDate() + 1); break;
    case 'D1': d.setUTCDate(d.getUTCDate() + 3); break;
    default: d.setUTCHours(d.getUTCHours() + 12);
  }
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
`

- [ ] Step 2: Update rows mapping to pass timeframe per signal
- [ ] Step 3: Commit

## Task 5: Signal Outcomes Tracking + Analytics

### Files: Create supabase/migrations/20260819000000_signal_outcomes.sql

- [ ] Step 1: Create signal_outcomes table with columns: signal_id, symbol, timeframe, signal_type, smc_setup, session_name, entry_price, exit_price, stop_loss, target_price, result, pips_result, risk_reward, confidence, tech_score, created_at, closed_at, holding_time (generated)
- [ ] Step 2: Create indexes on symbol, timeframe, result, created_at, smc_setup
- [ ] Step 3: Set up RLS (authenticated SELECT, service_role INSERT/UPDATE)
- [ ] Step 4: Create RPC get_pair_analytics(uid) - win rate by pair
- [ ] Step 5: Create RPC get_timeframe_analytics(uid) - win rate by timeframe
- [ ] Step 6: Create RPC get_smc_setup_analytics() - win rate by SMC setup type
- [ ] Step 7: Create RPC get_equity_curve(days, uid) - cumulative pips over time
- [ ] Step 8: Commit

## Task 6: Populate Outcomes on Signal Close

### Files: Modify supabase/functions/close-signals/index.ts

- [ ] Step 1: After updating signal status to tp/sl, insert into signal_outcomes with exit_price, pips_result, session info
- [ ] Step 2: Commit

## Task 7: Enforce Expiry via Cron

### Files: Create supabase/migrations/20260819000001_enforce_expiry_cron.sql

- [ ] Step 1: Create SQL function that marks expired signals
- [ ] Step 2: Add pg_cron job running every 15 minutes
- [ ] Step 3: Commit

## Task 8: Client-Side Analytics

### Files: Modify src/hooks/useHistory.ts, Create src/components/AnalyticsBreakdown.tsx

- [ ] Step 1: Add usePairAnalytics() hook calling get_pair_analytics RPC
- [ ] Step 2: Add useTimeframeAnalytics() hook
- [ ] Step 3: Create AnalyticsBreakdown component showing per-pair win rate, per-timeframe stats, equity curve
- [ ] Step 4: Integrate into historico.tsx
- [ ] Step 5: Commit

## Task 9: Admin Manual Signal Improvements

### Files: Modify supabase/functions/admin-manage/index.ts

- [ ] Step 1: Accept smc_setup, analysis, expires_at in add_signal action
- [ ] Step 2: Apply spread buffer to manual signals
- [ ] Step 3: Commit

## Task 10: Specialist Document

### Files: Create SIGNAL_SYSTEM_SPECIALIST.md

- [x] Complete - See SIGNAL_SYSTEM_SPECIALIST.md

---

## Verification

After all tasks:
1. Run supabase db push to apply migrations
2. Deploy edge functions: supabase functions deploy generate-crypto-signals close-signals
3. Test signal generation: curl -X POST <supabase-url>/functions/v1/generate-crypto-signals -H 'Authorization: Bearer <service-role-key>'
4. Verify XAU/USD uses Twelve Data: check logs for "Twelve Data" instead of "Frankfurter EUR"
5. Verify tech-rejected signals appear in logs
6. Check signal_outcomes table populates after TP/SL
7. Test analytics RPCs: select * from get_pair_analytics()
8. Verify expiry: create test signal with short expiry, wait for close-signals cron
