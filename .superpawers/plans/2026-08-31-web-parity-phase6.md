# Web ↔ Mobile Parity — Phase 6: i18n (14 languages) + themes + onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Review

- **Status:** FAIL → **RESOLVED** (all findings addressed)
- **Reviewer:** superpawers-reviewer
- **Date:** 2026-08-31
- **Resolution notes (2026-08-31):**
  - ✅ [Critical] Task 6.4 now uses `export default App;`.
  - ✅ [Major] Tasks 6.9–6.18 extraction tables rewritten against REAL verified pt.json keys (correct namespaces/subkeys confirmed via Read of `mobile/src/lib/i18n/locales/pt.json`). Phrase "verify/add-if-missing" retained only where genuinely uncertain (e.g. `sinal.fullChart`, `auth.*` new keys for web email/password, `horarios.tip`, `common.notFound*`, `components.economicEvent.*`), all of which now explicitly note "add to pt.json + en.json".
  - ✅ [Major] Task 6.21 replaced `t("tour.stepIndicator", …)` with hardcoded `{step + 1} / {STEPS.length}`.
  - ✅ [Minor] RTL wired end-to-end: `setDocumentLanguage()` helper (sets `lang` + `dir`) added to i18n index; used in `initI18n`, `setLanguage`, and `LanguageSync` (with `languageChanged` listener).
  - ✅ [Minor] Task 6.4 Step 4 reference corrected to Tasks 6.20/6.21/6.22.
  - ✅ [Minor] Architecture text corrected: no `<I18nextProvider>`; `initI18n()` in main.tsx + `useTranslation` hooks only.
  - ✅ [Minor] `tmt_theme` is now read: main.tsx seeds next-themes' `theme` key from `tmt_theme` at startup; Tema page also re-applies on mount.
  - ✅ [Minor] Task 6.20 AiFab dropped unused `useEffect` import.
- **Findings (original):**
  - [Critical — Dead reference / build-breaker] Task 6.4 Step 2 writes `export default defaultApp;` but the component is declared as `const App`. `defaultApp` is undefined, so `npm run build` (expected PASS in Step 4) will fail. Should be `export default App;`.
  - [Major — Key consistency] The extraction tables (Tasks 6.9–6.18) present almost none of the referenced i18n keys as existing in the mobile `pt.json`; the mobile key namespaces differ substantially from what the tables claim. Verified against `mobile/src/lib/i18n/locales/pt.json`:
    - Task 6.10 maps the entire web email/password auth flow to `auth.login/email/password/register/forgotPassword/rememberMe/name/confirmPassword/hasAccount/noAccount/loginTitle/registerTitle/recoverPassword/sendRecoveryLink` — none exist; the mobile `auth` namespace is phone/WhatsApp-OTP based.
    - `<common>.login/logout/back/copyright/navigation` (Tasks 6.9–6.11, 6.18) do not exist in `common` (which has `loading,cancel,save,send,retry,close,confirm,ok,comingSoon,error,all,…`).
    - `inicio.welcome/title/nextBoom/performance/winRate/pnl/operations/viewAnalyses/viewSchedules/channels` (Task 6.11) mostly absent (only `newsTitle`, etc. exist).
    - `sinal.technicalAnalysis/probability/riskReward/fullChart/entry/stopLoss/target/active/pending/expired/closed/viewed/analysis/viewDetail` (Tasks 6.11–6.12) absent (`sinal` has `title,loading,notFound,shareText,slPips,tpPips,rr,technical,noReasons,smcSetup,riskWarning`).
    - `analises.setupBos/premium/locked/pair/timeframe/type/pairLabel` (Task 6.11) absent; `pairLabel` exists only under `admin`.
    - `historico.title/pairFilter/operations/pnl` (Task 6.11) absent (`historico` has `allPairs,totalSignals,winRate,totalPips,emptyTitle,…`).
    - `planos.unlock/analysisPremium/basic/pro/premium/currency` (Tasks 6.12–6.13) absent (`planos` has `free`, `subscribe`, `mostPopular`, `featured`, `usd/aoa`, feature arrays, …).
    - `capital.capital/goal` (Task 6.13) absent (real: `title,lockTitle,target,currentBalance,…`).
    - `depositos.deposit/withdraw/paymentMethod/proof/binance/multicaixa` (Task 6.13) absent (real: `tabDeposit/tabWithdraw/withdrawMethod/sendProof/…`).
    - `notificacoes.empty/planRequests/markAllRead/minutesAgo` (Task 6.14) absent (real: `emptyTitle/minAgo/clearAll/…`; `markAllRead` is under `admin`).
    - `perfil.title/settings/deposits/journal/aiSupport/boomSettings` (Task 6.14) absent (real: `signOut/signIn/diario/binance/…`).
    - `diario.empty/monthOperations/winRate`, `suporteIa.clearChat`, `definicoesBooms.alarms/activate/premiumCustomization`, `horarios.subtitle/currentLocalTime/settings/notifActive/notifActivate/notifHint/tip` (Task 6.14) absent (real: `diario.noTrades/monthTrades/monthWinRate`, `suporteIa.clear`, `definicoesBooms.alarmsTitle/enable/lockTitle`, `horarios.description/watAngola/…`, alarms under `components.alarmToggle`).
    - Task 6.9 Footer maps `legal.riskDisclaimer/riskText/navigation/terms/privacy` — absent (real: `legal.termos/privacidade/aviso/termosDoc/privacidadeDoc/avisoRiscoDoc`).
    - `components.communityFeed.*` (Task 6.16) — no such `components` sub-namespace exists.
    The plan only flags this generically in Risks (§“Key mismatches … This is rare”), but for the extraction tables the mismatches are the norm, not the exception. The tables list non-existent keys as though they are “the mobile’s existing key structure.” Recommend verifying each mapping against pt.json (Task 6.9 alone carries this instruction) or marking each table with the verified key before execution.
  - [Major — Dead reference in shipped code] Task 6.21 renders `t("tour.stepIndicator", {…})` but `tour.stepIndicator` does not exist in the `tour` namespace (only `skip,next,finish,step1–6Title/Desc`) — would render the raw key string.
  - [Minor — Gap between risk flag and task] §Risks (RTL) says “Add this to LanguageSync” for `dir="rtl"`, and Task 6.6 adds the `[dir="rtl"]` CSS rule, but no task step actually sets `document.documentElement.dir` for Arabic; the RTL behavior is never wired.
  - [Minor — Inconsistent task reference] Task 6.4 Step 4 says AiFab/OnboardingTour/PremiumWelcomeModal “are created as stubs in step 6.18-6.20”; they are actually created in Tasks 6.20/6.21/6.22.
  - [Minor — Wording inconsistency] Architecture says “add I18nextProvider wrapper,” but the Task 6.4 `App.tsx` code contains no `<I18nextProvider>` (relies on `initReactI18next` in `initI18n()`).
  - [Minor — Dead persistence key] Task 6.7 writes `localStorage['tmt_theme']`, but nothing reads it on startup (next-themes persists under its own key and `defaultTheme="system"`); the stated `tmt_theme` persistence mechanism is effectively dead.
  - [Minor — Lint] Task 6.20 AiFab imports `useEffect` but never uses it.
  - **Strengths:** Spec (master Phase 6) coverage is complete — 14-language i18n, themes, string extraction, onboarding tour, AiFab, premium welcome, and final lint/build/smoke all map to tasks (6.1–6.24). Task ordering/dependencies are sound (6.4 stubs precede 6.20–6.22; 6.23 dead-export cleanup after 6.4). The infra code samples (i18n init, `languages.ts`, `LanguageSync`, Tema, Idioma, AiFab, OnboardingTour, PremiumWelcomeModal) are internally consistent, the locale list matches mobile (`pt,en,es,fr,ja,ln,de,it,nl,zh,ko,ru,sw,ar`), the `tmt_` localStorage prefix convention is consistent, and each task has explicit build/commit steps.

**Goal:** Port mobile's 14-language i18n system, dark/light theme toggle, onboarding tour, AI floating button, and premium welcome modals to the web. All UI strings become translatable; theme persists per user.

**Architecture:** Install `i18next` + `react-i18next` with the same config pattern as `mobile/src/lib/i18n/index.ts`. Copy the 14 locale JSON files from mobile (normalizing trailing commas in pt/en/es). A new `src/lib/i18n/` mirrors mobile's structure. Language and theme are persisted in `localStorage` (`tmt_lang`, `tmt_theme`). i18n is initialized once via `initI18n()` called from `src/main.tsx` (using `initReactI18next` + `useTranslation` hooks; **no `<I18nextProvider>` wrapper is needed** — `main.tsx` calls `initI18n()` before render, and the `LanguageSync` component reflects language changes into `document.documentElement.lang`/`dir`). Theme is applied via `next-themes` ThemeProvider toggling a `.dark` class on `<html>`, which switches CSS variables in `src/index.css`. All 90+ `.tsx` files with hardcoded PT strings are refactored to use `t('key')` with the mobile's existing key namespaces. Onboarding tour is a simplified multi-step Dialog (web-appropriate). AiFab is a floating button linking to `/suporte-ia`.

**Tech Stack:** i18next + react-i18next + next-themes (already installed) + shadcn/ui Dialog.

**Decisions:**
- Theme light palette: added as `.light` CSS variable block in `index.css`, keeping the existing dark `:root` vars unchanged.
- `premiumWelcome` / `premiumBanner` keys: included in pt.json and en.json only (matching mobile); other 12 locales fall back to pt.
- `resolveJsonModule: true` added to `tsconfig.app.json` (one-line change, enables type-safe JSON imports).
- Onboarding tour: simplified multi-step shadcn Dialog (not spotlight-positioned), persists per-user in `localStorage` (`tmt_onboarding_completed`).
- AiFab: floating `Button` with `MessageSquare` icon linking to `/suporte-ia`, shown for logged-in users only.
- localStorage keys follow existing `tmt_` prefix convention (`tmt_lang`, `tmt_theme`, `tmt_onboarding_completed`).

---

## Files summary

| Action | Path |
|--------|------|
| Create | `src/lib/i18n/index.ts` |
| Create | `src/lib/i18n/languages.ts` |
| Create | `src/lib/i18n/i18next.d.ts` |
| Create | `src/lib/i18n/locales/*.json` (14 files) |
| Create | `src/hooks/useLanguage.ts` |
| Create | `src/pages/Idioma.tsx` |
| Create | `src/pages/Tema.tsx` |
| Create | `src/components/AiFab.tsx` |
| Create | `src/components/OnboardingTour.tsx` |
| Create | `src/components/PremiumWelcomeModal.tsx` |
| Modify | `tsconfig.app.json` (add `resolveJsonModule: true`) |
| Modify | `src/App.tsx` (add I18nextProvider, ThemeProvider, LanguageSync, AiFab, OnboardingTour, PremiumWelcomeModal; replace TemaPage/IdiomaPage imports) |
| Modify | `src/main.tsx` (import i18n init) |
| Modify | `src/index.css` (add `.light` palette, RTL support for Arabic) |
| Modify | `index.html` (remove hardcoded `lang="pt"`) |
| Modify | `package.json` (add i18next, react-i18next) |
| Modify | ALL `src/pages/*.tsx` (extract hardcoded PT strings to `t()`) |
| Modify | `src/components/layout/Navbar.tsx` (extract + dynamic brand name) |
| Modify | `src/components/layout/Footer.tsx` (extract) |
| Modify | ALL `src/components/**/*.tsx` with user-facing strings (extract) |
| Modify | `src/hooks/*.ts` with toast/error strings (extract) |
| Modify | `src/lib/*.ts` with toast/error strings (extract) |

---

### Task 6.1: Install i18n deps + enable resolveJsonModule

- [ ] **Step 1:** Install i18next and react-i18next:
```bash
npm install i18next react-i18next
```
Expected: `package.json` shows both deps.

- [ ] **Step 2:** Add `resolveJsonModule` to `tsconfig.app.json` (line 17, after `"noEmit": true`):
```json
"resolveJsonModule": true,
```

- [ ] **Step 3:** Verify tsc still passes:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: 0 errors (new dep doesn't break anything; no JSON imports yet).

- [ ] **Step 4:** Commit.
```bash
git add package.json package-lock.json tsconfig.app.json
git commit -m "chore(web): install i18next + react-i18next, enable resolveJsonModule"
```

---

### Task 6.2: Create i18n infrastructure files

- [ ] **Step 1:** Create `src/lib/i18n/languages.ts` (verbatim from `mobile/src/lib/i18n/languages.ts`):
```ts
export interface Language {
  code: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'pt', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ln', nativeName: 'Lingála', flag: '🇨🇩' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'zh', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'sw', nativeName: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦' },
];

export const SUPPORTED_CODES: string[] = LANGUAGES.map((l) => l.code);
```

- [ ] **Step 2:** Create `src/lib/i18n/index.ts` (web adaptation of `mobile/src/lib/i18n/index.ts` — uses `localStorage` instead of `AsyncStorage`, no `expo-localization`):
```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_CODES } from './languages';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ln from './locales/ln.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import sw from './locales/sw.json';
import ar from './locales/ar.json';

export const STORAGE_KEY = 'tmt_lang';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ja: { translation: ja },
  ln: { translation: ln },
  de: { translation: de },
  it: { translation: it },
  nl: { translation: nl },
  zh: { translation: zh },
  ko: { translation: ko },
  ru: { translation: ru },
  sw: { translation: sw },
  ar: { translation: ar },
};

export function detectDeviceLanguage(): string {
  try {
    const code = navigator.language?.split('-')[0];
    if (code && SUPPORTED_CODES.includes(code)) return code;
  } catch { /* ignore */ }
  return 'pt';
}

export function getStoredLanguage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED_CODES.includes(stored) ? stored : null;
  } catch { return null; }
}

const RTL_CODES = ['ar'];

export function setDocumentLanguage(code: string): void {
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_CODES.includes(code) ? 'rtl' : 'ltr';
}

export function setLanguage(code: string): void {
  if (!SUPPORTED_CODES.includes(code)) return;
  i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  setDocumentLanguage(code);
}

export function initI18n(): typeof i18n {
  if (i18n.isInitialized) return i18n;
  const stored = getStoredLanguage();
  i18n.use(initReactI18next).init({
    resources,
    lng: stored ?? detectDeviceLanguage(),
    fallbackLng: 'pt',
    returnNull: false,
    interpolation: { escapeValue: false },
  });
  setDocumentLanguage(i18n.language?.split('-')[0] ?? 'pt');
  return i18n;
}

export { i18n };
```

- [ ] **Step 3:** Create `src/lib/i18n/i18next.d.ts`:
```ts
import 'i18next';
import pt from './locales/pt.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof pt };
  }
}
```

- [ ] **Step 4:** Verify build (JSON imports not yet wired, just checking the files compile):
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS (files exist but aren't imported yet; JSON imports will resolve once wired into App).

- [ ] **Step 5:** Commit.
```bash
git add src/lib/i18n/
git commit -m "feat(web): i18n infrastructure — i18next init, languages, type defs"
```

---

### Task 6.3: Copy + sanitize 14 locale JSON files

Copy the 14 locale JSON files from `mobile/src/lib/i18n/locales/` to `src/lib/i18n/locales/`. The 3 source files (pt.json, en.json, es.json) have trailing commas that must be removed for Vite/tsc compatibility.

- [ ] **Step 1:** Copy all 14 files from mobile, sanitizing trailing commas. Use a PowerShell script:
```powershell
$src = "mobile/src/lib/i18n/locales"
$dst = "src/lib/i18n/locales"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
foreach ($lang in @("pt","en","es","fr","ja","ln","de","it","nl","zh","ko","ru","sw","ar")) {
    $raw = Get-Content "$src/$lang.json" -Raw -Encoding UTF8
    # Remove trailing commas before } or ]
    $sanitized = $raw -replace ',(\s*[}\]])', '$1'
    [System.IO.File]::WriteAllText("$dst/$lang.json", $sanitized, [System.Text.UTF8Encoding]::new($false))
}
```
Verify all 14 files exist: `Get-ChildItem src/lib/i18n/locales/*.json | Measure-Object` → count = 14.

- [ ] **Step 2:** Validate each file is strict-JSON parseable:
```powershell
foreach ($f in Get-ChildItem src/lib/i18n/locales/*.json) {
    try { $null = Get-Content $f.FullName -Raw | ConvertFrom-Json; Write-Output "OK: $($f.Name)" }
    catch { Write-Output "FAIL: $($f.Name)" }
}
```
Expected: all 14 show OK.

- [ ] **Step 3:** Verify build (now the i18n/index.ts can resolve the JSON imports):
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS.

- [ ] **Step 4:** Commit.
```bash
git add src/lib/i18n/locales/
git commit -m "feat(web): 14 locale JSON files (pt, en, es, fr, ja, ln, de, it, nl, zh, ko, ru, sw, ar)"
```

---

### Task 6.4: Wire providers into App.tsx + main.tsx

- [ ] **Step 1:** Update `src/main.tsx` — import i18n init before render; also seed the theme from `tmt_theme` so the stored value is actually applied on startup (next-themes reads its own key at provider mount, so copy `tmt_theme` → next-themes' key if present and next-themes' key is absent):
```tsx
import { createRoot } from "react-dom/client";
import { initI18n } from "@/lib/i18n";
import App from "./App.tsx";
import "./index.css";

initI18n();

// Apply persisted theme from our tmt_theme key on startup.
// next-themes defaults to the "theme" storage key; seed it from tmt_theme if present.
try {
  const storedTheme = localStorage.getItem("tmt_theme");
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    const ntKey = localStorage.getItem("theme");
    if (ntKey === null) localStorage.setItem("theme", storedTheme);
  }
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 2:** Update `src/App.tsx` — add ThemeProvider (next-themes) + LanguageSync + TemaPage/IdiomaPage real imports + AiFab + OnboardingTour + PremiumWelcomeModal. NOTE: there is **no `<I18nextProvider>`** in the code — `initI18n()` is called in `main.tsx` before render and components use `useTranslation()` directly. The provider nesting becomes:
```
QueryClientProvider
└─ ThemeProvider (next-themes)
   └─ AuthProvider
      └─ TooltipProvider
         ├─ <Toaster />, <Sonner />
         ├─ <LanguageSync />
         ├─ <AiFab />
         ├─ <OnboardingTour />
         ├─ <PremiumWelcomeModal />
         └─ BrowserRouter
            └─ <Routes>…</Routes>
```

The full updated `src/App.tsx`:
```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageSync } from "@/components/LanguageSync";
import { AiFab } from "@/components/AiFab";
import { OnboardingTour } from "@/components/OnboardingTour";
import { PremiumWelcomeModal } from "@/components/PremiumWelcomeModal";
import Perfil from "./pages/Perfil";
import Depositos from "./pages/Depositos";
import Banca from "./pages/Banca";
import Tema from "./pages/Tema";
import Idioma from "./pages/Idioma";
import Notificacoes from "./pages/Notificacoes";
import { DiarioTrader } from "./pages/DiarioTrader";
import { DefinicoesBooms } from "./pages/DefinicoesBooms";
import SinalChart from "./pages/SinalChart";
import Index from "./pages/Index";
import Analises from "./pages/Analises";
import Historico from "./pages/Historico";
import SuporteIa from "./pages/SuporteIa";
import Planos from "./pages/Planos";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminGate from "./pages/AdminGate";
import Horarios from "./pages/Horarios";
import Comunidade from "./pages/Comunidade";
import ComunidadeCanal from "./pages/ComunidadeCanal";
import ComunidadeDm from "./pages/ComunidadeDm";
import ComunidadePesquisa from "./pages/ComunidadePesquisa";
import ComunidadeNovoCanal from "./pages/ComunidadeNovoCanal";
import ComunidadeNovoDm from "./pages/ComunidadeNovoDm";
import PerfilPublico from "./pages/PerfilPublico";
import Loja from "./pages/Loja";
import RecuperarSenha from "./pages/RecuperarSenha";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import AvisoRisco from "./pages/AvisoRisco";
import SignalDetail from "./pages/SignalDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LanguageSync />
          <AiFab />
          <OnboardingTour />
          <PremiumWelcomeModal />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/analises" element={<Analises />} />
              <Route path="/analises/:id" element={<SignalDetail />} />
              <Route path="/analises/:id/chart" element={<SinalChart />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/banca" element={<Banca />} />
              <Route path="/depositos" element={<Depositos />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/diario-trader" element={<DiarioTrader />} />
              <Route path="/suporte-ia" element={<SuporteIa />} />
              <Route path="/definicoes-booms" element={<DefinicoesBooms />} />
              <Route path="/tema" element={<Tema />} />
              <Route path="/idioma" element={<Idioma />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
              <Route path="/admin-gate" element={<AdminGate />} />
              <Route path="/horarios" element={<Horarios />} />
              <Route path="/comunidade" element={<Comunidade />} />
              <Route path="/comunidade/canais/:channelId" element={<ComunidadeCanal />} />
              <Route path="/comunidade/dm/:conversationId" element={<ComunidadeDm />} />
              <Route path="/comunidade/pesquisa" element={<ComunidadePesquisa />} />
              <Route path="/comunidade/novo-canal" element={<ComunidadeNovoCanal />} />
              <Route path="/comunidade/novo-dm" element={<ComunidadeNovoDm />} />
              <Route path="/comunidade/user/:userId" element={<PerfilPublico />} />
              <Route path="/comunidade/loja" element={<Loja />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/aviso-risco" element={<AvisoRisco />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
```

Note: the old `PlaceholderPages` imports for `TemaPage`/`IdiomaPage` are removed. If `PlaceholderPages.tsx` still exports them and no other file imports them, the dead exports can be removed in a later cleanup step (or now — check `grep TemaPage src/` first).

- [ ] **Step 3:** Create `src/components/LanguageSync.tsx` (reads stored language on mount, syncs html lang + dir):
```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getStoredLanguage, STORAGE_KEY, setDocumentLanguage } from "@/lib/i18n";

export function LanguageSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
    setDocumentLanguage(i18n.language?.split('-')[0] ?? 'pt');
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      i18n.changeLanguage(e.newValue);
      setDocumentLanguage(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    const onLanguageChanged = (lng: string) => setDocumentLanguage(lng.split('-')[0]);
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n]);
  return null;
}
```

- [ ] **Step 4:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS (AiFab, OnboardingTour, PremiumWelcomeModal are created in Tasks 6.20/6.21/6.22; for now, create minimal stub files that just `export function AiFab() { return null; }` etc. so the build doesn't break).

- [ ] **Step 5:** Commit.
```bash
git add src/main.tsx src/App.tsx src/components/LanguageSync.tsx
git commit -m "feat(web): wire i18n + theme providers, LanguageSync, route Tema/Idioma"
```

---

### Task 6.5: useLanguage hook

- [ ] **Step 1:** Create `src/hooks/useLanguage.ts`:
```ts
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { setLanguage as persistLanguage } from "@/lib/i18n";

export function useLanguage() {
  const { i18n } = useTranslation();
  const currentCode = (i18n.language?.split('-')[0] ?? 'pt') as string;
  const current = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

  const setCode = useCallback((code: string) => {
    persistLanguage(code);
  }, []);

  return { current, currentCode, languages: LANGUAGES, setCode } as const;
}
```

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS.

- [ ] **Step 3:** Commit.
```bash
git add src/hooks/useLanguage.ts
git commit -m "feat(web): useLanguage hook"
```

---

### Task 6.6: Theme CSS — `.light` palette + dark mode

- [ ] **Step 1:** Update `src/index.css` — the existing `:root` block stays as the dark palette (it already IS dark). Add a `.light` block immediately after `.dark` (after line 52) with inverted light values. Also add RTL support for Arabic. The full changes to `index.css`:

Replace the `.dark { ... }` block (lines 49-52) and the empty lines after with:
```css
  .dark,
  .dark body {
    --background: 240 25% 4%;
    --foreground: 210 40% 96%;
  }
  .light,
  .light body {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 142 70% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 20% 46%;
    --accent: 43 96% 52%;
    --accent-foreground: 220 30% 4%;
    --destructive: 4 86% 58%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 70% 42%;
    --success-foreground: 0 0% 100%;
    --warning: 43 96% 52%;
    --warning-foreground: 220 30% 4%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 142 70% 45%;
    --sidebar-background: 210 40% 98%;
    --sidebar-foreground: 222 47% 11%;
    --sidebar-primary: 142 70% 45%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 210 40% 96%;
    --sidebar-accent-foreground: 222 47% 11%;
    --sidebar-border: 214 32% 91%;
    --sidebar-ring: 142 70% 45%;
  }
  [dir="rtl"] {
    direction: rtl;
  }
```

- [ ] **Step 2:** Update `index.html` — remove hardcoded `lang="pt"` (it's now set dynamically by `LanguageSync`):
```html
<html lang="pt">
```
Change to:
```html
<html lang="pt" class="dark">
```
(The `class="dark"` is needed as the default for next-themes `attribute="class"` — next-themes will toggle it; the `lang` stays "pt" as initial but is overwritten by LanguageSync.)

- [ ] **Step 3:** Verify:
```bash
npm run build
```
Expected: PASS.

- [ ] **Step 4:** Commit.
```bash
git add src/index.css index.html
git commit -m "feat(web): light theme CSS palette, dark default class, RTL support"
```

---

### Task 6.7: `/tema` page — real ThemeSwitcher

- [ ] **Step 1:** Create `src/pages/Tema.tsx` (adapted from `mobile/src/app/tema.tsx`):
```tsx
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const MODES = [
  { value: "system" as const, icon: Monitor, key: "theme.system" },
  { value: "dark" as const, icon: Moon, key: "theme.dark" },
  { value: "light" as const, icon: Sun, key: "theme.light" },
] as const;

const STORAGE_KEY = "tmt_theme";

export default function Tema() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = mounted ? (theme ?? "system") : "system";

  const handleSet = (value: string) => {
    setTheme(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  };

  return (
    <Layout title={t("theme.title")}>
      <div className="space-y-3">
        {MODES.map(({ value, icon: Icon, key }) => (
          <button
            key={value}
            onClick={() => handleSet(value)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 font-medium">{t(key)}</span>
            {current === value && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS.

- [ ] **Step 3:** Commit.
```bash
git add src/pages/Tema.tsx
git commit -m "feat(web): /tema theme switcher (system/light/dark)"
```

---

### Task 6.8: `/idioma` page — language switcher

- [ ] **Step 1:** Create `src/pages/Idioma.tsx` (adapted from `mobile/src/app/idioma.tsx`):
```tsx
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { useLanguage } from "@/hooks/useLanguage";
import { Check } from "lucide-react";

export default function Idioma() {
  const { t } = useTranslation();
  const { current, languages, setCode } = useLanguage();

  return (
    <Layout title={t("language.title")}>
      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setCode(lang.code)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="flex-1 font-medium">{lang.nativeName}</span>
            {current.code === lang.code && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS.

- [ ] **Step 3:** Commit.
```bash
git add src/pages/Idioma.tsx
git commit -m "feat(web): /idioma language switcher (14 languages)"
```

---

### Task 6.9: Extract strings — Layout shell (Navbar, Footer)

This is the highest-traffic extraction task. The pattern for every file is:
1. Add `import { useTranslation } from "react-i18next";` at top
2. Add `const { t } = useTranslation();` at start of component body
3. Replace each hardcoded PT string with `t('key.subkey')`, using the mobile's existing key structure from pt.json

**Pattern — before:**
```tsx
<button>Entrar</button>
```

**Pattern — after:**
```tsx
<button>{t('common.login')}</button>
```

- [ ] **Step 1:** Extract `src/components/layout/Navbar.tsx` — key mappings (using REAL mobile pt.json keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Home"` | `t('tabs.inicio')` |
| `"Análises"` | `t('tabs.analises')` |
| `"Histórico"` | `t('tabs.historico')` |
| `"Planos"` | `t('planos.title')` (exists) |
| `"Horários"` | `t('tabs.horarios')` |
| `"Comunidade"` | `t('tabs.comunidade')` |
| `"Perfil"` | `t('tabs.perfil')` |
| `"Entrar"` | `t('perfil.signIn')` (real key) |
| `"Criar Conta"` | `t('auth.enterApp')` (real key) |
| `"Sair"` | `t('perfil.signOut')` (real key) |
| `"Notificações"` | `t('notificacoes.title')` (real key) |
| `"Upgrade Premium"` | `t('planos.subscribe')` (real key) |

IMPORTANT: Verify each key exists in `src/lib/i18n/locales/pt.json` BEFORE using it. If a PT string has no exact key, use the closest real key or add a new key to `pt.json` AND `en.json` in the matching namespace (and leave the other 12 locales on next sync).

- [ ] **Step 2:** Extract `src/components/layout/Footer.tsx` — key mappings (using REAL mobile pt.json keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Aviso de Risco:"` | `t('legal.aviso')` (real key) |
| The risk paragraph | `t('legal.avisoRiscoDoc.intro')` (real key — or nearest `legal.avisoRiscoDoc.*` section) |
| `"Navegação"` | `t('components.dashboardHeader.appName')` — NO. Use `t('common.trader')`? NO. There is NO "Navegação" key; use `t('workspace.title')`? NO. Best available: add a comma-keys or use `t('legal.termos')`-adjacent. **Decision:** add `common.navigation` key to pt.json + en.json if none fits. |
| `"Termos de Uso"` | `t('legal.termos')` (real key) |
| `"Privacidade"` | `t('legal.privacidade')` (real key) |
| `"Aviso de Risco"` | `t('legal.aviso')` (real key) |
| `© 2026 The Magic Trader...` | NO copyright key exists. Add `common.copyright` to pt.json + en.json. |

Note on adding new keys: `legal.avisoRiscoDoc.intro`, `legal.termosDoc.*`, `legal.privacidadeDoc.*` all exist and cover the legal page body text. For the Footer's nav-header/copyright that have no mobile key, add new keys (`common.navigation`, `common.copyright`) to BOTH `pt.json` and `en.json` (they'll fall back to pt for the other 12).

- [ ] **Step 3:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: PASS.

- [ ] **Step 4:** Commit.
```bash
git add src/components/layout/Navbar.tsx src/components/layout/Footer.tsx
git commit -m "feat(web): extract i18n strings — Navbar, Footer"
```

---

### Task 6.10: Extract strings — Auth pages (Login, Registro, RecuperarSenha)

- [ ] **Step 1:** Extract `src/pages/Login.tsx` — key mappings (using REAL mobile pt.json keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Entrar"` | `t('perfil.signIn')` |
| `"Email"` | NO `auth.email` key exists. Add `auth.email` to pt.json + en.json. |
| `"Senha"` | NO `auth.password` key exists. Add `auth.password` to pt.json + en.json. |
| `"Lembrar-me"` | NO key. Add `auth.rememberMe` to pt.json + en.json. |
| `"Esqueceu a senha?"` | NO key. Add `auth.forgotPassword` to pt.json + en.json. |
| `"Criar conta"` / `"Ainda não tem conta?"` | `t('auth.enterApp')` / add `auth.noAccount` |
| `"A carregar..."` | `t('common.loading')` |
| Toast strings | `t('common.error')`, and add specific `auth.loginError` to pt.json + en.json |

NOTE: The mobile's `auth.*` namespace is phone/WhatsApp-OAuth focused (keys: codeInvalid, codeLabel, codePlaceholder, codeSent, continueGoogle, enterApp, enterWhatsapp, invalidPhone, legalFooterAfter, legalFooterBefore, legalPrivacy, legalTerms, or, phoneLabel, phonePlaceholder, resendCode, sendCode, value1-3, verifyCode, whatsappPrompt). The web's email/password login differs from mobile — so most `auth.*` web strings need NEW keys. Add them under `auth.email`, `auth.password`, `auth.rememberMe`, `auth.forgotPassword`, `auth.login_title` etc. in pt.json + en.json. Register/login labels use `auth.enterApp` for "Criar Conta" / `auth.enterWhatsapp` not applicable.

- [ ] **Step 2:** Extract `src/pages/Registro.tsx` — key mappings:

| Hardcoded PT | i18n key |
|---|---|
| `"Criar conta"` / `"Registar"` | `t('auth.enterApp')` (existing) |
| `"Nome"` | add `auth.name` to pt.json + en.json |
| `"Email"` | add `auth.email` |
| `"Senha"` | add `auth.password` |
| `"Confirmar senha"` | add `auth.confirmPassword` |
| `"Já tem conta?"` | add `auth.hasAccount` |
| `"Entrar"` | `t('perfil.signIn')` |

- [ ] **Step 3:** Extract `src/pages/RecuperarSenha.tsx` — key mappings:

| Hardcoded PT | i18n key |
|---|---|
| `"Recuperar senha"` | add `auth.recoverPassword` |
| `"Email"` | add `auth.email` |
| `"Enviar link"` | add `auth.sendRecoveryLink` |
| `"Voltar ao login"` | `common` has no back key — add `common.back` |

For all "add" keys: they must be added to BOTH `pt.json` and `en.json` (the other 12 locales fall back to pt). This is a deliberate extension of the mobile key set to cover web-specific email/password flows.

- [ ] **Step 4:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 5:** Commit.
```bash
git add src/pages/Login.tsx src/pages/Registro.tsx src/pages/RecuperarSenha.tsx
git commit -m "feat(web): extract i18n strings — Login, Registro, RecuperarSenha"
```

---

### Task 6.11: Extract strings — Core pages (Index, Analises, SignalDetail, SinalChart, Historico)

- [ ] **Step 1:** Extract `src/pages/Index.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| Dashboard headings | `t('components.dashboardHeader.morning')` / `.afternoon` / `.evening` / `.subtitle` |
| `"Próximo Boom"` card | `t('components.nextBoomCard.title')` / `.boom` / `.launchAt` / `.calculating` |
| `"Performance"` card | `t('components.performanceCard.title')` / `.winRate` / `.totalSignals` / `.totalPips` / `.viewHistory` |
| `"Notícias"` | `t('inicio.newsTitle')` / `t('inicio.newsLoading')` |
| `"Canais"/sinais` | `t('inicio.channelSignalsTitle')` / `.channelSignalsSubtitle` |
| `"Ver análises"` / `"Ver tudo"` | `t('inicio.viewAll')` |
| `"Alta volatilidade"` | `t('inicio.highVolatility')` |
| `"Próximas horas"` | `t('inicio.nextHours')` |
| `"Secção ao vivo"/"Secção próximas"` | `t('inicio.liveSection')` / `t('inicio.upcomingSection')` |
| WAT time | `t('inicio.wat')` |
| Empty states | `t('inicio.emptyTitle')` / `t('inicio.emptyBody')` |
| Announce CTA | `t('inicio.announceCta')` |

- [ ] **Step 2:** Extract `src/pages/Analises.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Análises"` page title | `t('analises.title')` |
| Filter chip labels: `"Todos"` | `t('analises.filterAll')` |
| `"Filtrar par"` | `t('analises.filterPairs')` |
| `"Filtrar SMC"` | `t('analises.filterSmc')` |
| `"Filtrar timeframe"` | `t('analises.filterTimeframe')` |
| `"Filtrar tipo"` | `t('analises.filterType')` |
| `"Premium"` / locked | `t('analises.premiumTitle')` / `t('analises.premiumDesc')` / `t('analises.premiumSignals')` |
| `"Sem sinais"/empty` | `t('analises.emptyTitle')` / `t('analises.emptyBody')` |
| `"A carregar..."` | `t('analises.loading')` |
| `"Estado"`/`"Analisar"` | `t('analises.analytics')` |
| `"Preço atual"` | `t('analises.currentPrice')` |
| `"Entrada"/"SL"/"TP"` | `t('analises.entry')` / `t('analises.sl')` / `t('analises.tp')` |
| `"Ver completo"` | `t('analises.viewFull')` |
| `"Gerar sinais"` | `t('analises.generateBtn')` |
| `"Gerando..."` | `t('analises.generating')` |
| `"Alta volatilidade"/highlight` | `t('analises.highlight')` |
| `"Pips abertos"` | `t('analises.pipsOpen')` |
| Upsell points | `t('analises.upsellPoint1')` / `.2` / `.3` |
| `"Sinais premium"` | `t('analises.premiumSignals')` |
| `"Fim de semana mercado fechado"` | `t('analises.weekendMarketClosed')` / `.Body` / `t('analises.weekendCryptoAiBody')` |

- [ ] **Step 3:** Extract `src/pages/SignalDetail.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Análise Técnica"` | `t('sinal.technical')` |
| `"Setup SMC"` | `t('sinal.smcSetup')` |
| `"Risco/Retorno"` | `t('sinal.rr')` |
| `"Gráfico completo"` | NO exact key — add `sinal.fullChart` to pt.json + en.json |
| `"Voltar"` | NO `common.back` — add `common.back` |
| `"Entrada"/"SL"/"TP"` | `t('components.tradingViewChart.entry')` / `.stopLoss` / `.takeProfit` (real keys!) |
| `"Aviso de risco"` | `t('sinal.riskWarning')` |
| `"Sem razões"` | `t('sinal.noReasons')` |
| `"Não encontrado"` | `t('sinal.notFound')` |
| `"SL pips"/"TP pips"` | `t('sinal.slPips')` / `t('sinal.tpPips')` |
| `"A carregar..."` | `t('sinal.loading')` |
| `"Partilhar"` | `t('sinal.shareText')` |
| Premium lock | `t('components.premiumLock.viewPlans')` |

- [ ] **Step 4:** Extract `src/pages/SinalChart.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key |
|---|---|
| `"A carregar análise…"` | `t('sinal.loading')` |
| `"Sinal não encontrado"` | `t('sinal.notFound')` |
| `"Fechar"` | `t('common.close')` |
| Premium lock | `t('components.premiumLock.viewPlans')` |
| `"Análise Premium"` (lock) | `t('planos.analysisPremium')` — NOTE: verify this key; if absent, use `t('analises.premiumTitle')` |

- [ ] **Step 5:** Extract `src/pages/Historico.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Histórico"` | `t('historico.title')` — NOTE: there is NO `historico.title` in pt.json (only historico.allPairs, closedSignals, dateTime, etc.). Use `t('tabs.historico')`. |
| `"Filtro por par"` | `t('historico.allPairs')` |
| `"Todos os pares"` | `t('historico.allPairs')` |
| `"Sinais fechados"` | `t('historico.closedSignals')` |
| `"Data/Hora"` | `t('historico.dateTime')` |
| `"Entrada"/"SL"/"TP"` | `t('historico.entry')` / `t('historico.stopLoss')` / `t('historico.takeProfit')` |
| `"Resultado"/"RR"` | `t('historico.result')` / `t('historico.rr')` |
| `"SL atingido"/"TP atingido"` | `t('historico.slHit')` / `t('historico.tpHit')` |
| `"Expirado"` | `t('historico.expired')` |
| `"Pips totais"/"Sinais totais"/"Win rate"` | `t('historico.totalPips')` / `t('historico.totalSignals')` / `t('historico.winRate')` |
| `"Sem registos"/empty` | `t('historico.emptyTitle')` / `t('historico.emptyBody')` |
| `"A carregar..."` | `t('historico.loading')` |

- [ ] **Step 5:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 6:** Commit.
```bash
git add src/pages/Index.tsx src/pages/Analises.tsx src/pages/SignalDetail.tsx src/pages/SinalChart.tsx src/pages/Historico.tsx
git commit -m "feat(web): extract i18n strings — Index, Analises, SignalDetail, SinalChart, Historico"
```

---

### Task 6.12: Extract strings — Signal components

- [ ] **Step 1:** Extract `src/components/signals/SignalCard.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Ativo"` | `t('components.signalCard.active')` |
| `"Pendente"` | `t('components.signalCard.pending')` |
| `"AGUARDAR"` | `t('components.signalCard.waiting')` |
| `"Em espera"` | `t('common.waiting')` |
| `"Análise"` | `t('components.signalCard.analysis')` |
| `"Perda"/"Lucro"` | `t('components.signalCard.inLoss')` / `t('components.signalCard.inProfit')` |
| `"Agora"` | `t('components.signalCard.now')` |
| `"No ponto"` | `t('components.signalCard.atPoint')` |
| `"Entrada"/"RR"/"Pips"` | `t('components.signalCard.entry')` / `t('components.signalCard.rr')` / `t('components.signalCard.pips')` |
| `"Mais razões"` | `t('components.signalCard.moreReasons')` |
| `"Ver detalhe"` | `t('components.signalCard.analysis')` or `t('analises.viewFull')` |

- [ ] **Step 2:** Extract `src/components/signals/PremiumLock.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Desbloquear"` | `t('analises.premiumTitle')` (verify) — else add `planos.unlock` |
| `"Análise Premium"` | `t('analises.premiumTitle')` |
| `"Ver Planos"` | `t('components.premiumLock.viewPlans')` (real key!) |
| `"Subscrever"` | `t('planos.subscribe')` (real key) |
| Lock text | `t('components.ui.lockedPrefix')` (real key) |

- [ ] **Step 3:** Extract `src/components/signals/PlanUpsellModal.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Subscrever"` | `t('planos.subscribe')` |
| `"Cancelar"` | `t('common.cancel')` |
| Plan names: `"Gratuito"` | `t('planos.free')` |
| `"Basic"` | `t('planos.featureBasic')` or `t('components.dashboardHeader.basic')` |
| `"Pro"` | `t('components.dashboardHeader.pro')` |
| `"Premium"` | `t('components.dashboardHeader.premium')` |
| `"MAIS POPULAR"` | `t('planos.mostPopular')` |
| `"TOP"` / `featured` | `t('planos.featured')` |
| `"Plano atual"` | `t('planos.currentPlan')` |
| Feature list sections | `t('planos.featureFree')` (arrays) etc. |
| `"Mudar plano"` | `t('planos.change')` (real key) |

- [ ] **Step 4:** Extract `src/components/economics/EconomicEventBadge.tsx` and `src/components/AlarmToggle.tsx` — small files. Real keys:

| Component | Hardcoded PT | i18n key |
|---|---|---|
| AlarmToggle | `"Ativar"` / `"Notificação ativa"` | `t('components.alarmToggle.activate')` / `t('components.alarmToggle.active')` |
| AlarmToggle | `"Bloqueada"` | `t('components.alarmToggle.blocked')` |
| AlarmToggle | `"Notificamos-te 5 min antes"` | `t('components.alarmToggle.hint5min')` |
| EconomicEventBadge | impact labels (`"Alto"`, `"Médio"`, `"Baixo"`) | add keys under `horarios.*` or `components.economicEvent.*` in pt.json + en.json (no existing key) |

- [ ] **Step 5:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 6:** Commit.
```bash
git add src/components/signals/ src/components/economics/ src/components/AlarmToggle.tsx
git commit -m "feat(web): extract i18n strings — signal components, alarm, economics"
```

---

### Task 6.13: Extract strings — Finance (Planos, Depositos, Banca + components)

- [ ] **Step 1:** Extract `src/pages/Planos.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Planos"` | `t('planos.title')` |
| Plan names: `"Gratuito"` | `t('planos.free')` |
| `"Basic"` | `t('components.dashboardHeader.basic')` |
| `"Pro"` | `t('components.dashboardHeader.pro')` |
| `"Premium"` | `t('components.dashboardHeader.premium')` |
| Taglines | `t('planos.taglineBasic')` / `t('planos.taglinePro')` / `t('planos.taglinePremium')` |
| Feature list sections | `t('planos.featureFree')` / `t('planos.featureBasic')` / `t('planos.featurePro')` / `t('planos.featurePremium')` (arrays of strings) |
| `"Subscrever"` | `t('planos.subscribe')` |
| `"Criar e subscrever"` | `t('planos.createAndSubscribe')` |
| `"Plano atual"` | `t('planos.currentPlan')` |
| `"Plano ativo"` | `t('planos.planActive')` |
| `"Premium ativo"` | `t('planos.premiumActive')` |
| `"Até"` / `"Premium até"` | `t('planos.premiumUntil')` |
| `"USD"` / `"AOA"` | `t('planos.usd')` / `t('planos.aoa')` |
| `"MAIS POPULAR"` | `t('planos.mostPopular')` |
| `"DESTAQUE"` | `t('planos.featured')` |
| `"Alterar"` | `t('planos.change')` |
| `"Agora grátis"` | `t('planos.currentFree')` |
| Hero | `t('planos.heroTitle')` / `t('planos.heroSubtitle')` |
| Alerts sections | `t('planos.alertsWhatsapp')` / `.alertsTelegram` / `.alertsEmail` (+ desc) |
| Capital spot | `t('planos.capitalSpotTitle')` / `.capitalSpotDesc` / `t('planos.capitalCta')` |
| Trust | `t('planos.trustSecure')` / `t('planos.trustSupport')` / `t('planos.trustCancel')` |
| `"Depois do pagamento"` | `t('planos.afterPayment')` |
| `"Escolher método"` | `t('planos.chooseMethod')` |
| `"Pagamento"` | `t('planos.paymentTitle')` / `t('planos.paymentAmount')` |
| `"Instruções de pagamento"` | `t('planos.payInstructions')` |
| `"Recibo"/"Comprovativo"` | `t('planos.receiptHint')` / `t('planos.receiptMsg')` / `t('planos.receiptSent')` / `t('planos.receiptOk')` |

- [ ] **Step 2:** Extract `src/pages/Depositos.tsx` (152 broad strings — largest file) — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Depósitos"` | `t('depositos.title')` |
| `"Depositar"` / `"Levantar"` tabs | `t('depositos.tabDeposit')` / `t('depositos.tabWithdraw')` |
| `"Depósito"` section | `t('depositos.depositSection')` / `t('depositos.depositCta')` |
| `"Plano"` | `t('depositos.plan')` / `t('depositos.choosePlan')` |
| `"Enviar comprovativo"` | `t('depositos.sendProof')` / `t('depositos.sendProofHint')` |
| `"Comprovativo anexado"` | `t('depositos.proofAttached')` |
| `"Montante"` | `t('depositos.amount')` |
| `"Sem movimentos"/empty` | `t('depositos.empty')` |
| Movement types | `t('depositos.movementDeposit')` / `t('depositos.movementWithdraw')` / `t('depositos.movementCapital')` |
| Withdraw section | `t('depositos.withdrawSection')` / `t('depositos.withdrawCta')` / `t('depositos.withdrawSubtitle')` |
| `"Montante a levantar"` | `t('depositos.withdrawAmount')` |
| `"Método"` | `t('depositos.withdrawMethod')` |
| `"Detalhes"` | `t('depositos.withdrawDetails')` |
| Status | `t('depositos.statusPendente')` / `t('depositos.statusConcluido')` |
| `"Saldo"/"Balance"` | `t('depositos.balance')` / `t('depositos.balanceSub')` |
| Confirmation | `t('depositos.confirmWithdrawMsg')` / `t('depositos.confirmWithdrawOk')` |
| `"Copiar número"` | `t('depositos.copyNumber')` / `t('depositos.numberCopied')` |
| `"Nota segura"` | `t('depositos.secureNote')` |
| `"Sucesso"/Erros` | `t('depositos.receiptSaveError')` / `t('depositos.pendingDepositTitle')` / `.Msg` / `t('depositos.invalidWithdraw')` |
| Capital deposit | `t('depositos.capitalDepositTitle')` / `.Subtitle` |
| History | `t('depositos.historySection')` |
| Delete movement | `t('depositos.deleteMovement')` / `.Title` / `.Msg` |

- [ ] **Step 3:** Extract `src/pages/Banca.tsx` — key mappings (real keys — note: mobile uses `banca.*` namespace which already has rich keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Banca"` | `t('banca.title')` |
| `"Subtitle"` | `t('banca.subtitle')` |
| `"Bloqueado"` | `t('banca.lockTitle')` / `t('banca.lockDesc')` |
| `"Capital total"` | `t('banca.totalCapital')` |
| `"Total P&L"` | `t('banca.totalPnl')` |
| `"Win rate"` | `t('banca.winRate')` |
| `"Trades"` | `t('banca.trades')` |
| `"Esta semana"/"Este mês"` | `t('banca.weekly')` / `t('banca.monthly')` |
| `"Hoje P&L"` | `t('banca.todayPnl')` |
| `"Semana P&L"` | `t('banca.weekPnl')` |
| Recent trades | `t('banca.recentTrades')` |
| `"Salvar"` | `t('banca.save')` |
| `"Cancelar"` | `t('banca.cancel')` |
| `"Em breve"` | `t('common.comingSoon')` |
| Direction/Entry/Exit/Lot/Profit | `t('banca.tradeDirection')` / `.tradeEntry` / `.tradeExit` / `.tradeLot` / `.tradeProfit` / `.tradePips` / `.tradeNotes` / `.tradeNotesPlaceholder` / `.tradePair` / `.tradeResult` |
| Performance | `t('banca.performance')` / `.profitFactor` / `.riskPerOp` |

- [ ] **Step 4:** Extract banca components: `src/components/banca/PaymentModal.tsx`, `ReceiptSuccessModal.tsx`, `CapitalSimulatorCard.tsx`, `GrowthPlanSection.tsx` — apply pattern, map strings. Real keys:

| Component | Hardcoded PT | i18n key |
|---|---|---|
| PaymentModal | `"Pagamento"` | `t('planos.paymentTitle')` |
| PaymentModal | `"Cancelar"` | `t('common.cancel')` |
| CapitalSimulatorCard | titles/desc | `t('capital.simulatorTitle')` / `.simulatorDesc` / `.simulatorAmount` / `.simulatorInvested` / `.simulatorProfit` / `.simulatorProjected` / `.simulatorStrategy` / `.simulatorDepositCta` |
| GrowthPlanSection | `"Plano de crescimento"` | `t('planoCrescimento.title')` / `.activate` / `.investment` / `.period` / `.months` / `.monthOne` / `.projection` / `.estimatedProfit` / `.estimatedReturn` / `.planActive` / `.conservative` `.balanced` `.aggressive` + `.Desc` / `.select` |
| CapitalSimulatorCard | `"Meta de retorno"` | `t('capital.returnTarget')` / `t('capital.progressTitle')` |

- [ ] **Step 5:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 6:** Commit.
```bash
git add src/pages/Planos.tsx src/pages/Depositos.tsx src/pages/Banca.tsx src/components/banca/
git commit -m "feat(web): extract i18n strings — Planos, Depositos, Banca, banca components"
```

---

### Task 6.14: Extract strings — Profile/Settings (Perfil, Notificacoes, DiarioTrader, SuporteIa, DefinicoesBooms, Horarios)

- [ ] **Step 1:** Extract `src/pages/Perfil.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Perfil"` | `t('tabs.perfil')` |
| `"Inicia sessão"` | `t('perfil.signIn')` |
| `"Criar Conta"` | `t('auth.enterApp')` |
| `"Sair"` | `t('perfil.signOut')` |
| `"Sessão"/account section` | `t('perfil.sectionAccount')` |
| `"Preferências"` | `t('perfil.sectionPreferences')` |
| `"Admin"` | `t('perfil.sectionAdmin')` / `t('perfil.adminArea')` / `t('perfil.adminBadge')` |
| `"Levantar"/withdraw section` | `t('perfil.sectionWithdraw')` |
| `"Banca"` | `t('perfil.banca')` / `t('perfil.bancaManagement')` / `t('perfil.viewBanca')` |
| `"Diário"` | `t('perfil.diario')` |
| `"Notificações"` | `t('perfil.notifications')` |
| `"Gerir alertas"` | `t('perfil.manageAlerts')` |
| `"Plano de crescimento"` | `t('perfil.growthPlan')` |
| `"Tema"` | `t('theme.title')` |
| `"Idioma"` | `t('language.title')` |
| `"Capital"` | `t('perfil.capital')` |
| `"Membro desde"` | `t('perfil.memberSince')` |
| `"Meu plano"/subscription` | `t('perfil.mySubscription')` / `t('perfil.premiumUntil')` / `t('perfil.premium')` / `t('perfil.freePlan')` |
| `"Nome"`/edit name | `t('perfil.nameLabel')` / `t('perfil.editName')` / `t('perfil.nameSaved')` / `t('perfil.nameEmpty')` / `t('perfil.nameSaveError')` |
| `"Segurança"` | `t('perfil.security')` |
| `"Verificado"` | `t('perfil.verified')` |

- [ ] **Step 2:** Extract `src/pages/Notificacoes.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Notificações"` | `t('notificacoes.title')` |
| `"Sem notificações"` | `t('notificacoes.emptyTitle')` / `.emptyBody` |
| `"Tudo lido"` | `t('notificacoes.allRead')` |
| `"Limpar tudo"` | `t('notificacoes.clearAll')` |
| `"Hoje"` | `t('notificacoes.today')` |
| `"Esta semana"` | `t('notificacoes.thisWeek')` |
| `"Mais cedo"` | `t('notificacoes.earlier')` |
| `"Agora"` | `t('notificacoes.justNow')` |
| `"Min atrás"` | `t('notificacoes.minAgo', { count })` (plural `_one`/`_other`) |
| `"H atrás"` | `t('notificacoes.hoursAgo', { count })` |
| `"Dias atrás"` | `t('notificacoes.daysAgo', { count })` |
| `"Nas próximas"/scheduled | `t('notificacoes.scheduledFor')` / `.soon` / `.inMin` / `.inHm` |
| Summary | `t('notificacoes.summaryTitle')` |
| `"Entregue"` | `t('notificacoes.delivered')` |
| `"Pedido de plano pendente"` | `t('notificacoes.planPending')` / `.planProcessing` |
| `"Ativar alarmes"` | `t('notificacoes.enableAlarms')` / `t('notificacoes.manageAlerts')` |
| `"Atualizar"` | `t('notificacoes.refresh')` |
| `"A carregar..."` | `t('notificacoes.loading')` |

- [ ] **Step 3:** Extract `src/pages/DiarioTrader.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json — uses `diario.*` + `banca.*`) |
|---|---|
| `"Diário do Trader"` | `t('diario.title')` |
| Subtitle | `t('diario.subtitle')` |
| `"Registar"` | `t('diario.addTrade')` |
| `"Exportar CSV"` | `t('diario.exportCsv')` |
| `"Sem operações"` | `t('diario.noTrades')` / `.noTradesHint` |
| `"Operações no mês"` | `t('diario.monthTrades')` |
| `"Win Rate"` | `t('diario.monthWinRate')` |
| `"P&L do mês"` | `t('diario.monthPnl')` |
| Day title | `t('diario.dayTitle')` |
| `"Total de trades"` | `t('diario.tradesCount')` |
| `"Preço atual"` | `t('diario.currentPrice')` |
| `"Pips automático"` | `t('diario.pipsAuto')` |
| Form fields | `t('diario.tradeDirection')` / `.tradePair` / `.tradeEntry` / `.tradeExit` / `.tradeLot` / `.tradePips` / `.tradeProfit` / `.tradeResult` / `.tradeNotes` / `.tradeNotesPlaceholder` |
| `"Guardar"` | `t('diario.save')` |
| `"Cancelar"` | `t('diario.cancel')` |
| `"Apagar"` | `t('diario.delete')` / `.deleteTrade` / `.deleteTradeConfirm` |
| Errors | `t('diario.invalidProfit')` / `.invalidValue` |

- [ ] **Step 4:** Extract `src/pages/SuporteIa.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Suporte IA"` | `t('suporteIa.title')` |
| Subtitle | `t('suporteIa.subtitle')` |
| Welcome | `t('suporteIa.welcome')` / `.welcomeDesc` |
| 4 suggestions | `t('suporteIa.suggestion1')` / `.suggestion2` / `.suggestion3` / `.suggestion4` |
| `"Enviar"` | `t('suporteIa.send')` |
| Placeholder | `t('suporteIa.placeholder')` |
| `"Limpar"` | `t('suporteIa.clear')` |
| `"Fechar"` | `t('suporteIa.close')` |
| Quota remaining | `t('suporteIa.remainingChat')` / `.remainingImage` |
| AI errors | `t('aiErrors.quotaChat')` / `.quotaImage` / `.quotaBurst` / `.connection` / `.noResponse` / `.auth` / `.contact` / `.unknown` — NOTE: `aiErrors` real namespace has `close/export/generate/load` subkeys under `adminErrors`; AI-specific errors are `aiErrors.connection`, `aiErrors.noResponse`, `aiErrors.quotaChat`, `aiErrors.quotaImage`, `aiErrors.quotaBurst`, `aiErrors.auth`, `aiErrors.contact`, `aiErrors.unknown` (verify if exist; add to pt.json + en.json if missing) |

- [ ] **Step 5:** Extract `src/pages/DefinicoesBooms.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json) |
|---|---|
| `"Definições do Boom"` | `t('definicoesBooms.title')` |
| `"Alarmes & Notificações"` | `t('definicoesBooms.alarmsTitle')` / `.alarmsDesc` |
| `"Ativar"` | `t('definicoesBooms.enable')` |
| `"Ativar notificação"` | `t('definicoesBooms.enableNotification')` |
| `"Personalização Premium"` | `t('definicoesBooms.lockTitle')` / `.lockDesc` |
| `"Ver Planos"` | `t('components.premiumLock.viewPlans')` |
| Volatility tiers | `t('definicoesBooms.volAll')` / `.volLow` / `.volMedium` / `.volHigh` / `.volHint` |
| `"Tendência"` | `t('definicoesBooms.trend')` |
| `"Pares"` | `t('definicoesBooms.pairs')` / `.pairsHint` / `.noPairs` |
| `"Filtrar booms"` | `t('definicoesBooms.filterBooms')` / `.filterDesc` |
| `"Repor"/reset` | `t('definicoesBooms.reset')` |
| `"Visíveis"` | `t('definicoesBooms.visibleCount')` |
| `"Sem pares"/empty` | `t('definicoesBooms.emptyTitle')` |
| `"Janelas por vol."` | `t('definicoesBooms.windowsByVol')` |
| `"Todos"` | `t('definicoesBooms.all')` |

- [ ] **Step 6:** Extract `src/pages/Horarios.tsx` — key mappings (real keys):

| Hardcoded PT | i18n key (exists in pt.json — uses `horarios.*` + `components.boomHourCard.*`) |
|---|---|
| `"Hora do Boom"` | `t('horarios.title')` |
| Description | `t('horarios.description')` |
| `"Hora atual (Angola)"` | `t('horarios.watAngola')` |
| `"GMT"` | `t('horarios.watUtc')` |
| `"Próximo boom"` | `t('horarios.nextBoom')` |
| `"Ao vivo"` | `t('horarios.live')` |
| `"Próximo"` | `t('horarios.upcoming')` |
| `"Encerrado"` | `t('horarios.closed')` |
| `"Para entrada"` | `t('horarios.forEntry')` |
| `"GMT"/window` | `t('components.boomHourCard.gmt')` / `.window` / `.wat` / `.forEntry` / `.closed` / `.closedHint` / `.live` / `.upcoming` / `.volatility` |
| `"Filtros ativos"` | `t('horarios.filtersActive')` |
| `"Sem booms"/empty` | `t('horarios.noFilteredBooms')` / `.noFilteredBoomsDesc` / `.emptyTitle` / `.emptyBody` |
| `"Ajustar filtros"` | `t('horarios.adjustFilters')` |
| Tip | `t('horarios.errorTitle')` — verify; tip has no dedicated key; add `horarios.tip` to pt.json + en.json or reuse `common` tip |

- [ ] **Step 7:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 8:** Commit.
```bash
git add src/pages/Perfil.tsx src/pages/Notificacoes.tsx src/pages/DiarioTrader.tsx src/pages/SuporteIa.tsx src/pages/DefinicoesBooms.tsx src/pages/Horarios.tsx
git commit -m "feat(web): extract i18n strings — Perfil, Notificacoes, Diario, SuporteIa, DefinicoesBooms, Horarios"
```

---

### Task 6.15: Extract strings — Community pages

- [ ] **Step 1:** Extract all 8 community pages (`Comunidade.tsx`, `ComunidadeCanal.tsx`, `ComunidadeDm.tsx`, `ComunidadePesquisa.tsx`, `ComunidadeNovoCanal.tsx`, `ComunidadeNovoDm.tsx`, `PerfilPublico.tsx`, `Loja.tsx`) — apply the same pattern: `const { t } = useTranslation()` + replace hardcoded strings. Use these REAL namespaces/keys from pt.json:

**Comunidade hub (`Comunidade.tsx`)** — `t('comunidade.title')`, `t('comunidade.live')`, `t('comunidade.upcoming')`, `t('comunidade.closed')`, `t('comunidade.loading')`, `t('comunidade.errorTitle')`, `t('comunidade.emptyTitle')`, `t('comunidade.emptyBody')`, `t('comunidade.liveBadge')`, `t('workspace.segmented')`, `t('workspace.feed')`, `t('workspace.heroTitle')`, `t('workspace.heroSubtitle')`, `t('workspace.channels')`, `t('workspace.dms')`, `t('workspace.pairRooms')`, `t('workspace.newChannel')`, `t('workspace.newDm')`, `t('workspace.search')`, `t('workspace.searchPlaceholder')`, `t('workspace.title')`.

**Channel detail (`ComunidadeCanal.tsx`)** — `t('workspace.channelName')`, `t('workspace.closed')`, `t('workspace.closedNote')`, `t('workspace.closesIn')`, `t('workspace.composerPlaceholder')`, `t('workspace.noMessages')`, `t('workspace.loadOlder')`, `t('workspace.loading')`, `t('workspace.errorTitle')`, `t('workspace.sendTo')`, `t('workspace.bot')`.

**DM (`ComunidadeDm.tsx`)** — `t('workspace.dmOnline')`, `t('workspace.dmOffline')`, `t('workspace.composerPlaceholder')`, `t('workspace.noMessages')`, `t('workspace.loadOlder')`, `t('workspace.loading')`, `t('userProfile.online')`, `t('userProfile.lastSeenAgo')`.

**Search (`ComunidadePesquisa.tsx`)** — `t('workspace.search')`, `t('workspace.searchPlaceholder')`, `t('workspace.searchEmpty')`, `t('workspace.noMessages')`, `t('workspace.loading')`.

**Novo canal (`ComunidadeNovoCanal.tsx`)** — `t('workspace.newChannel')`, `t('workspace.channelName')`, `t('workspace.channelDisplayNamePlaceholder')`, `t('workspace.channelNoDesc')`, `t('workspace.channelNameMin')`, `t('workspace.channelCreate')`, `t('workspace.channelCreating')`, `t('workspace.channelCreated')`, `t('workspace.channelCreateFailed')`, `t('workspace.channelNameExists')`, `t('workspace.selectUser')`, `t('workspace.permission')`.

**Novo DM (`ComunidadeNovoDm.tsx`)** — `t('workspace.newDm')`, `t('workspace.selectUser')`, `t('workspace.noProfiles')`, `t('workspace.dms')`.

**Perfil público (`PerfilPublico.tsx`)** — `t('userProfile.title')`, `t('userProfile.online')`, `t('userProfile.lastSeenAgo')`, `t('userProfile.memberSince')`, `t('userProfile.sendMessage')`, `t('userProfile.premium')`, `t('userProfile.freePlan')`, `t('userProfile.admin')`, `t('userProfile.notFound')`.

**Loja (`Loja.tsx`)** — `t('store.title')`, `t('store.subtitle')`, `t('store.featuredSection')`, `t('store.categoryAll')`, `t('store.categoryBots')`, `t('store.categoryEbooks')`, `t('store.categoryMentorias')`, `t('store.free')`, `t('store.premium')`, `t('store.premiumRequired')`, `t('store.premiumMessage')`, `t('store.items')`, `t('store.requestCta')`, `t('store.upgradeCta')`, `t('store.included')`, `t('store.statsProducts')`, `t('store.statsFree')`, `t('store.statsRating')`, `t('store.empty')`, `t('store.incBot1')`/`.2`/`.3`, `t('store.incEbook1')`/`.2`/`.3`, `t('store.incMentor1')`/`.2`/`.3`, `t('store.allProducts')`.

- [ ] **Step 2:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/pages/Comunidade*.tsx src/pages/PerfilPublico.tsx src/pages/Loja.tsx
git commit -m "feat(web): extract i18n strings — all community pages"
```

---

### Task 6.16: Extract strings — Community components

- [ ] **Step 1:** Extract `src/components/community/` (16 files) — apply pattern. Use REAL keys:

**CommunityFeed.tsx** (largest component) — `t('workspace.feed')`, `t('workspace.sharedToFeed')`, `t('workspace.shareToFeed')`, `t('workspace.shareLogin')`, `t('workspace.shareFailed')`, `t('workspace.noMessages')`, `t('workspace.loadMore')`(add if missing), `t('workspace.loading')`, `t('workspace.bot')`, `t('comunidade.liveBadge')`.

**CommunityHero.tsx** — `t('workspace.heroTitle')`, `t('workspace.heroSubtitle')`.

**WorkspaceSection.tsx** — `t('workspace.segmented')`, `t('workspace.feed')`, `t('workspace.channels')`, `t('workspace.dms')`, `t('workspace.pairRooms')`, `t('workspace.emptyChannels')`, `t('workspace.emptyChannelsHint')`, `t('workspace.emptyChannelsHintCreator')`, `t('workspace.emptyDms')`, `t('workspace.emptyDmsHint')`, `t('workspace.emptyDmsHintPremium')`, `t('workspace.emptyPairRooms')`, `t('workspace.emptyPairRoomsHint')`, `t('workspace.newChannel')`, `t('workspace.newDm')`.

**ChannelCard.tsx / ChannelRow.tsx** — `t('workspace.channelName')`, `t('workspace.closed')`, `t('workspace.enterRoom')`, `t('workspace.notificationChannel')`.

**ChannelPickerModal.tsx** — `t('workspace.selectUser')`, `t('workspace.channels')`, `t('workspace.channelCreate')`.

**DmRow.tsx** — `t('userProfile.online')`, `t('userProfile.lastSeenAgo')`, `t('workspace.dmOnline')`, `t('workspace.dmOffline')`.

**PairRoomCard.tsx / PairRoomRow.tsx** — `t('comunidade.live')`, `t('comunidade.upcoming')`, `t('comunidade.closed')`, `t('workspace.closedNote')`, `t('workspace.enterRoom')`.

**MessageList.tsx / MessageBubble.tsx / BoomMessage.tsx** — `t('workspace.noMessages')`, `t('workspace.edited')`, `t('workspace.react')`, `t('workspace.reply')`(add if missing), `t('workspace.messageActions')`, `t('workspace.mentionHeader')`, `t('workspace.deleteTitle')`, `t('workspace.deleteBody')`, `t('workspace.deleted')`, `t('workspace.deleteMessage')`.

**Composer.tsx** — `t('workspace.composerPlaceholder')`, `t('workspace.sendTo')`, `t('workspace.uploadingImage')`, `t('workspace.imageUploadFailedTitle')`, `t('workspace.imageUploadFailedBody')`, `t('workspace.cameraPermission')`, `t('workspace.chooseAnother')`(add if missing), `t('common.send')`.

**UserAvatar.tsx / UserAvatarGroup.tsx** — `t('userProfile.premium')`, `t('userProfile.online')`.

For any string with no exact key, add a new key to `pt.json` + `en.json` in the matching namespace (these are deliberate web-side extensions; the other 12 locales fall back to pt).

- [ ] **Step 2:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/components/community/
git commit -m "feat(web): extract i18n strings — community components"
```

---

### Task 6.17: Extract strings — Admin pages + components

- [ ] **Step 1:** Extract `src/pages/Admin.tsx`, `src/pages/AdminGate.tsx`, and all 17 admin components in `src/components/admin/` — apply pattern. Use the REAL `admin.*` and `adminErrors.*` namespaces. Key examples:

**AdminGate (`AdminGate.tsx`)** — `t('admin.gateTitle')`, `t('admin.gateSubtitle')`, `t('admin.gateCta')`, `t('admin.gateCodeLabel')`, `t('admin.gateLockedTitle')`, `t('admin.gateLockedDesc')`, `t('admin.gateWrong')`, `t('admin.checkingAccess')`, `t('adminErrors.notAuthenticated')`.

**Admin dashboard tabs (`Admin.tsx`)** — `t('admin.title')`, `t('admin.tabDashboard')`, `t('admin.tabSignals')`, `t('admin.tabBoom')`, `t('admin.tabBoomTimes')`, `t('admin.tabPosts')`, `t('admin.tabUsers')`, `t('admin.tabReceipts')`, `t('admin.tabWithdrawals')`, `t('admin.tabMessaging')`, `t('admin.tabReports')`, `t('admin.tabChannels')`, `t('admin.tabAnnouncements')`.

**AdminSignalsTab** — `t('admin.signalsList')`, `t('admin.addSignal')`, `t('admin.generateSignals')`, `t('admin.exportSignals')`, `t('admin.noSignals')`, `t('admin.newSignal')`, `t('admin.entryLabel')`, `t('admin.slLabel')`, `t('admin.tpLabel')`, `t('admin.typeLabel')`, `t('admin.pairLabel')`, `t('admin.reasonsLabel')`, `t('admin.confidenceLabel')`, `t('admin.expired')`, `t('admin.pending')`, `t('admin.active')`, `t('admin.search')`, `t('admin.filter')`, `t('admin.clearFilters')`, `t('admin.confirmDelete')`, `t('admin.deleteConfirm')`, `t('admin.errorTitle')`.

**AdminBoomHoursTab** — `t('admin.hoursList')`, `t('admin.addHour')`, `t('admin.newHour')`, `t('admin.gmtLabel')`, `t('admin.watLabel')`, `t('admin.autoGmt')`, `t('admin.volatility')`, `t('admin.noHours')`, `t('admin.deleteHourTitle')`, `t('admin.confirmDelete')`.

**AdminBoomTimesTab** — `t('admin.boomTimesList')`, `t('admin.addBoomTime')`, `t('admin.newBoomTime')`, `t('admin.deleteBoomTimeTitle')`, `t('admin.noBoomTimes')`, `t('admin.presetSessions')`, `t('admin.presetLondon')`, `t('admin.presetNewYork')`, `t('admin.presetTokyo')`, `t('admin.inMinutesLabel')`.

**AdminPostsTab** — `t('admin.newPost')`, `t('admin.publishPost')`, `t('admin.postsList')`, `t('admin.noPosts')`, `t('admin.titleLabel')`, `t('admin.titlePlaceholder')`, `t('admin.contentLabel')`, `t('admin.contentPlaceholder')`, `t('admin.postActive')`, `t('admin.postInactive')`, `t('admin.deletePostTitle')`.

**AdminUsersTab** — `t('admin.usersList')`, `t('admin.noUsersTitle')`, `t('admin.noUsersDesc')`, `t('admin.search')`, `t('admin.selectAll')`, `t('admin.deselectAll')`, `t('admin.selectedCount')`, `t('admin.deleteSelected')`, `t('admin.makePremium')`, `t('admin.removePremium')`, `t('admin.banUser')`, `t('admin.unbanUser')`, `t('admin.userBanned')`, `t('admin.userUnbanned')`, `t('admin.roleUpdated')`, `t('admin.pairsLabel')`, `t('admin.pairsPlaceholder')`, `t('admin.registeredAt')`, `t('admin.registrationDate')`, `t('admin.userDetails')`.

**AdminReceiptsTab** — `t('admin.receiptsList')`, `t('admin.pendingReceipts')`, `t('admin.noReceipts')`, `t('admin.noReceiptsDesc')`, `t('admin.receiptUser')`, `t('admin.receiptAmount')`, `t('admin.receiptDate')`, `t('admin.receiptMethod')`, `t('admin.receiptPlan')`, `t('admin.receiptStatus')`(verify), `t('admin.receiptViewProof')`, `t('admin.receiptApprove')`, `t('admin.receiptApproveConfirm')`, `t('admin.receiptApproveMsg')`, `t('admin.receiptApproved')`, `t('admin.receiptApprovedMsg')`, `t('admin.receiptApprovedOk')`, `t('admin.receiptReject')`, `t('admin.receiptRejectConfirm')`, `t('admin.receiptRejectMsg')`, `t('admin.receiptRejected')`, `t('admin.receiptRejectedMsg')`, `t('admin.receiptRejectedOk')`, `t('admin.receiptPending')`, `t('admin.receiptDeleteTitle')`, `t('admin.receiptDeleteConfirm')`.

**AdminWithdrawalsTab** — `t('admin.tabWithdrawals')`, `t('admin.noReceipts')`, `t('admin.statPendingReceipts')`(reuse), `t('admin.receiptApprove')`-style approve/reject (reuse receipt approve/reject keys where applicable).

**AdminMessagingTab** — `t('admin.notifications')`, `t('admin.markAllRead')`, `t('admin.noNotifications')`(verify), broadcast/plan-request strings — reuse `notifications.*` where applicable.

**AdminReportsTab** — reuse `admin.tabReports`, `admin.noNotifications`-adjacent (verify exact keys exist; add `admin.noReports` if missing).

**AdminChannelsTab** — `t('admin.tabChannels')`, `t('workspace.channelName')`, `t('admin.makePremium')`, `t('admin.removePremium')`, `t('admin.delete')`(verify, else add).

**AdminAnnouncementsTab** — `t('admin.tabAnnouncements')`, `t('admin.newPost')`, `t('admin.publishPost')`-adjacent, `t('admin.confirmDelete')`.

**BulkActionsBar** — `t('admin.selectAll')`, `t('admin.deselectAll')`, `t('admin.selectedCount')`, `t('admin.deleteSelected')`, `t('admin.export')`.

**SearchBar** — `t('admin.search')`.

**FilterChips / QuickChips / PairChips / SessionPresets / ConfidencePresets / TimePresets / SignalTypeToggle** — `t('admin.filter')`, `t('admin.quickPairs')`, `t('admin.presetSessions')`, `t('admin.presetLondon')`, `t('admin.presetNewYork')`, `t('admin.presetTokyo')`, `t('admin.confidenceLabel')`, `t('admin.typeLabel')`, `t('admin.pairLabel')`, `t('admin.pairsLabel')`, `t('admin.pairsPlaceholder')`, `t('admin.volLabel')`.

**UserDetailModal** — `t('admin.userDetails')`, `t('admin.userRole')`, `t('admin.makePremium')`, `t('admin.removePremium')`, `t('admin.banUser')`, `t('admin.unbanUser')`, `t('admin.subscriptionExpires')`, `t('admin.daysUntilExpiry')`, `t('admin.expiringSoon')`, `t('admin.expired')`, `t('admin.currentPlan')`, `t('admin.editExpiration')`, `t('admin.expiryUpdated')`, `t('admin.registerAt')`(verify), `t('admin.registeredAt')`, `t('admin.confirmDelete')`, `t('common.cancel')`, `t('common.save')`.

**SkeletonList / NotificationListModal** — `t('admin.notifications')`, `t('admin.noNotifications')`, `t('admin.markAllRead')`, `t('admin.loadingAdmin')`, `t('admin.loadError')`.

**AdminErrors** — `t('adminErrors.load')`, `t('adminErrors.close')`, `t('adminErrors.export')`, `t('adminErrors.generate')`, `t('adminErrors.unknown')`, `t('adminErrors.notAuthenticated')`.

For any string with no exact key, add a new key to `pt.json` + `en.json` in the matching namespace (other 12 locales fall back to pt).

- [ ] **Step 2:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/pages/Admin.tsx src/pages/AdminGate.tsx src/components/admin/
git commit -m "feat(web): extract i18n strings — admin pages and components"
```

---

### Task 6.18: Extract strings — Legal/misc + NotFound

- [ ] **Step 1:** Extract `src/pages/Termos.tsx`, `src/pages/Privacidade.tsx`, `src/pages/AvisoRisco.tsx`, `src/pages/NotFound.tsx` — apply pattern. Use REAL keys:

**Termos (`Termos.tsx`)**:
- Title: `t('legal.termosTitle')`
- Document sections: `t('legal.termosDoc.s1Title')` + `t('legal.termosDoc.s1Body')` … `t('legal.termosDoc.s7Title')` + `t('legal.termosDoc.s7Body')` (7 sections)

**Privacidade (`Privacidade.tsx`)**:
- Title: `t('legal.privacidadeTitle')`
- Sections: `t('legal.privacidadeDoc.s1Title')` + `s1Body` … `t('legal.privacidadeDoc.s7Title')` + `s7Body`
- Footer: `t('legal.privacidade')` (nav link)

**AvisoRisco (`AvisoRisco.tsx`)**:
- Title: `t('legal.avisoRiscoTitle')`
- Intro: `t('legal.avisoRiscoDoc.intro')`
- Sections: `t('legal.avisoRiscoDoc.s1Title')` + `s1Body` … `t('legal.avisoRiscoDoc.s6Title')` + `s6Body`
- Nav link: `t('legal.aviso')`

**NotFound (`NotFound.tsx`)** — no dedicated `notFound` i18n key in a `common`/`404` namespace. Add `common.notFoundTitle` + `common.notFoundBody` + `common.backHome` to pt.json + en.json.

**PagePlaceholder (`src/components/layout/PagePlaceholder.tsx`)** — `t('common.comingSoon')` (exists!) for the "Disponível em breve." and add `common.back` for "Voltar".

IMPORTANT — legal text parity: the mobile `legal.*Doc.*` translations contain the full legal body text. The web's `Termos/Privacidade/AvisoRisco` pages should render from these keys so the legal content matches mobile exactly. If the web's current hardcoded text differs from mobile's `legal.*Doc.*` content, use the mobile key content (parity requirement). Also update the risk disclaimer in the footer to use `t('legal.avisoRiscoDoc.intro')` or the first relevant section so it matches.

- [ ] **Step 3:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 4:** Commit.
```bash
git add src/pages/Termos.tsx src/pages/Privacidade.tsx src/pages/AvisoRisco.tsx src/pages/NotFound.tsx src/components/layout/PagePlaceholder.tsx
git commit -m "feat(web): extract i18n strings — legal pages, NotFound, PagePlaceholder"
```

---

### Task 6.19: Extract strings — Hooks + Lib files with user-facing toasts/errors

- [ ] **Step 1:** Search for user-facing strings in hooks and lib files:
```powershell
Select-String -Path "src\hooks\*.ts","src\lib\*.ts" -Pattern "\"[A-ZÁ-Ú][^\"]{4,}\"" | Select-Object -First 30
```

These files contain toast messages, error strings, and labels that are shown to users. They need `t()` calls too, but hooks/lib files don't have React component context — so they need to use `i18n.t()` (the i18n instance) directly, not the `useTranslation()` hook.

Key files to audit:
- `src/hooks/useTradeJournal.ts` — toast messages
- `src/hooks/useBanca.ts`, `useCapitalAccount.ts`, `useMovements.ts` — toast messages
- `src/hooks/useStoreProducts.ts` — toast messages
- `src/lib/payments.ts` — error messages
- `src/lib/notifications.ts` — toast messages (alarm activation, permission denied)
- `src/lib/boomPrefs.ts` — toast messages
- `src/lib/planRequests.ts` — toast messages
- `src/lib/adminApi.ts` — error messages

- [ ] **Step 2:** For each file, import `i18n` from `@/lib/i18n` and replace `toast(" mensagem ")` with `toast(i18n.t("key"))`. Example:

**Before:**
```ts
toast.error("Notificações bloqueadas no navegador");
```

**After:**
```ts
import { i18n } from "@/lib/i18n";
toast.error(i18n.t("notifications.blocked"));
```

- [ ] **Step 3:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 4:** Commit.
```bash
git add src/hooks/ src/lib/
git commit -m "feat(web): extract i18n strings — hooks and lib toast/error messages"
```

---

### Task 6.20: AiFab component

- [ ] **Step 1:** Create `src/components/AiFab.tsx` (simplified from `mobile/src/components/AiFab.tsx`):

```tsx
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const STORAGE_KEY = "tmt_ai_fab_y";

export function AiFab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [y, setY] = useState(() => {
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 300; } catch { return 300; }
  });

  // Hide on login, suporte-ia, and home
  const hidden = !user || ["/login", "/registro", "/suporte-ia", "/"].includes(pathname);
  if (hidden) return null;

  return (
    <Link to="/suporte-ia" className="fixed right-4 z-50" style={{ top: y }}>
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
        aria-label={t("components.aiFab.label")}
        draggable
        onDragEnd={(e) => {
          const newY = Math.max(80, Math.min(window.innerHeight - 80, e.clientY));
          setY(newY);
          try { localStorage.setItem(STORAGE_KEY, String(newY)); } catch { /* ignore */ }
        }}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </Link>
  );
}
```

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/components/AiFab.tsx
git commit -m "feat(web): AiFab floating button (links to /suporte-ia)"
```

---

### Task 6.21: OnboardingTour (simplified multi-step dialog)

- [ ] **Step 1:** Create `src/components/OnboardingTour.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function getStorageKey(userId?: string) {
  return `tmt_onboarding_completed_${userId ?? "guest"}`;
}

const STEPS = [
  { titleKey: "tour.step1Title", descKey: "tour.step1Desc" },
  { titleKey: "tour.step2Title", descKey: "tour.step2Desc" },
  { titleKey: "tour.step3Title", descKey: "tour.step3Desc" },
  { titleKey: "tour.step4Title", descKey: "tour.step4Desc" },
  { titleKey: "tour.step5Title", descKey: "tour.step5Desc" },
  { titleKey: "tour.step6Title", descKey: "tour.step6Desc" },
];

export function OnboardingTour() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = getStorageKey(user?.id);
    try {
      if (localStorage.getItem(key) !== "1") setShow(true);
    } catch { setShow(true); }
  }, [user?.id]);

  const complete = () => {
    setShow(false);
    try { localStorage.setItem(getStorageKey(user?.id), "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) complete(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(current.titleKey)}</DialogTitle>
          <DialogDescription>{t(current.descKey)}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {step + 1} / {STEPS.length}
        </p>
        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={complete}>
            {t("tour.skip")}
          </Button>
          <Button onClick={() => isLast ? complete() : setStep(step + 1)}>
            {isLast ? t("tour.finish") : t("tour.next")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/components/OnboardingTour.tsx
git commit -m "feat(web): OnboardingTour — 6-step welcome dialog (per-user once)"
```

---

### Task 6.22: PremiumWelcomeModal + PremiumCapitalCredit

- [ ] **Step 1:** Create `src/components/PremiumWelcomeModal.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function getStorageKey(subPeriodEnd?: string | null) {
  return `premium_welcome_seen_${subPeriodEnd ?? "none"}`;
}

export function PremiumWelcomeModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, isPremium } = useSubscription();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPremium || !subscription?.current_period_end) return;
    const key = getStorageKey(subscription.current_period_end);
    try {
      if (localStorage.getItem(key) !== "1") setShow(true);
    } catch { setShow(true); }
  }, [isPremium, subscription?.current_period_end]);

  const close = () => {
    setShow(false);
    const key = getStorageKey(subscription?.current_period_end);
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("premiumWelcome.title")}</DialogTitle>
          <DialogDescription>{t("premiumWelcome.body")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>{t("premiumWelcome.perkBank")}</li>
          <li>{t("premiumWelcome.perkSignals")}</li>
          <li>{t("premiumWelcome.perkChannels")}</li>
          <li>{t("premiumWelcome.perkStore")}</li>
        </ul>
        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={close}>{t("common.notNow")}</Button>
          <Button asChild>
            <Link to="/banca" onClick={close}>{t("premiumWelcome.ctaBank")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Note: `PremiumCapitalCredit` is a side-effect component that credits Banca on referral. Per the master plan: "where sensible". I'll skip it for web since the referral flow doesn't exist on web yet (can be added later). If you want parity, create a stub that returns null.

- [ ] **Step 2:** Verify:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 3:** Commit.
```bash
git add src/components/PremiumWelcomeModal.tsx
git commit -m "feat(web): PremiumWelcomeModal — one-time premium celebration"
```

---

### Task 6.23: Remove dead PlaceholderPages exports

- [ ] **Step 1:** Verify no other file imports `TemaPage` or `IdiomaPage` from PlaceholderPages:
```powershell
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "TemaPage|IdiomaPage" -Recurse
```
Expected: only `PlaceholderPages.tsx` itself (definition) — App.tsx no longer imports them.

- [ ] **Step 2:** Remove the `TemaPage` and `IdiomaPage` exports from `src/pages/PlaceholderPages.tsx`. If the file still exports other placeholder components (e.g. `BancaPage` if Banca was still a placeholder — but Banca is real now), keep those. If the file is now empty of exports, delete the file.

- [ ] **Step 3:** Verify build:
```bash
npx tsc --noEmit -p tsconfig.app.json && npm run build
```

- [ ] **Step 4:** Commit.
```bash
git add src/pages/PlaceholderPages.tsx
git commit -m "chore(web): remove dead TemaPage/IdiomaPage placeholder exports"
```

---

### Task 6.24: Phase 6 verification

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors; `npx tsc --noEmit` → 0 errors.
- [ ] **Step 2:** `npm run build` → PASS.
- [ ] **Step 3:** `npx eslint src/lib/i18n/** src/pages/Tema.tsx src/pages/Idioma.tsx src/components/AiFab.tsx src/components/OnboardingTour.tsx src/components/PremiumWelcomeModal.tsx src/components/LanguageSync.tsx src/hooks/useLanguage.ts src/App.tsx src/main.tsx` → 0 errors.
- [ ] **Step 4:** dev server + Playwright smoke (anonymous/free user):
  - `/idioma` → 14 languages listed with flags, clicking switches language, UI updates instantly.
  - `/tema` → 3 options (system/light/dark), switching to light changes CSS vars (background becomes white).
  - `/suporte-ia` → with language set to `en`, all UI strings show in English.
  - `/` → AiFab visible (logged-in user only — test logged-out: should NOT show).
  - First visit (no `tmt_onboarding_completed` in localStorage) → OnboardingTour dialog shows; step through 6 steps; dismiss → does not show again on reload.
  - Console: 0 app errors.
- [ ] **Step 5:** Record results in this file under `Phase 6 verification results`.

---

## Risks / Notes

- **Scope size:** ~700 strings across ~90 files. The extraction batches (Tasks 6.9–6.19) are the bulk of the work. Each batch can be done independently; if one batch causes issues, it can be rolled back without affecting others.
- **Key mismatches:** some hardcoded web strings may not have exact matches in the mobile's pt.json. When this happens, add a new key to pt.json (and en.json) in the appropriate namespace, then update the other 12 locales on next sync. This is rare — the mobile translations are comprehensive.
- **Trailing commas:** The 3 JSON files (pt/en/es) have trailing commas. The sanitization step (Task 6.3) removes them. If mobile updates these files, the sanitization step must be re-run.
- **RTL for Arabic:** The `.light`/`.dark` CSS doesn't change text direction. Arabic (`ar`) is RTL — the `[dir="rtl"]` rule is added but needs a mechanism to detect Arabic and set `dir="rtl"` on `<html>`. Add this to `LanguageSync` (if language is `ar`, set `document.documentElement.dir = "rtl"`, else `"ltr"`).
- **PremiumCapitalCredit:** Skipped for web (referral flow not yet on web). Can be added as a future task when referral links are implemented.
- **Mobile untouched:** never edit `mobile/**`.

---

## Phase 6 verification results

*(To be filled after Task 6.24 execution)*
