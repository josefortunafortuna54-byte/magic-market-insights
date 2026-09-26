# Hero Redesign — Terminal Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o hero centrado e decorativo do Home público por um hero de duas colunas cujo elemento focal é um terminal com um sinal real.

**Architecture:** Um novo componente `HeroSignalTerminal` lê `useSignals()` e `useLivePrices()` directamente (sem props, tal como os restantes componentes do projecto) e expõe `pickHeroSignal` como função pura exportada. `Index.tsx` passa a ter um `<section>` de duas colunas: texto à esquerda, terminal à direita. Nada mais na página é tocado.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, framer-motion, react-i18next, @tanstack/react-query, lucide-react, Supabase.

**Spec:** `.superpawers/specs/2026-09-26-hero-redesign-design.md`

---

## Nota sobre TDD — ler antes de começar

O projecto web **não tem test runner**: não existe `vitest`, `jest` nem `@testing-library` em `node_modules/`, e o `package.json` não define script `test`. O único runner do repositório está em `mobile/`, que é um projecto Expo separado.

Por isso **não há passo "escrever teste que falha"** neste plano. Cada task termina com gates de verificação reais:

```bash
npx tsc -b --noEmit
npx eslint <ficheiros tocados>
```

Introduzir vitest no web é uma decisão à parte e **não** faz parte deste âmbito. Se quiseres testes unitários de `pickHeroSignal`, diz e trato disso como task separada.

**Baseline Known (verificado em 2026-09-26):**
- `npx tsc -b --noEmit` → exit 0, limpo.
- `npx eslint src/pages/Index.tsx` → limpo.
- `npm run lint` (global) → **182 problemas pré-existentes** em `supabase/functions/`, `mobile/` e `tailwind.config.ts`. Não são nossos; nunca usar o lint global como gate.

---

## Mapa de ficheiros

| Ficheiro | Acção | Responsabilidade |
|---|---|---|
| `src/components/home/HeroSignalTerminal.tsx` | **criar** | Escolha do sinal + painel de terminal com estados de loading/vazio/populado |
| `src/pages/Index.tsx` | **modificar** (linhas 1-11 e 57-120) | Layout de duas colunas, remoções de decoração, H1, CTAs, barra de stats |

Nada mais é tocado. Não se modifica `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx` nem `src/lib/i18n/locales/`.

---

## Factos do código relevantes (verificados — não re-descobrir)

**`Signal` — `src/lib/types.ts:1-25`:**
```ts
export type SignalType = 'BUY' | 'SELL' | 'AGUARDAR';
export type SignalStatus = 'active' | 'pending' | 'tp' | 'sl' | 'expired';
export type SignalTier = 'free' | 'basic' | 'pro' | 'premium';

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;          // <- string, NÃO é union
  type: SignalType;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  status: SignalStatus;
  createdAt: string;
  tier: SignalTier;
  riskReward?: number;        // <- já existe, usar antes de calcular
  expiresAt?: string;
  analysis?: string;
  probabilityScore?: number;
  smcSetup?: string;
}
```

**Imports disponíveis:**
- `import type { Signal } from "@/lib/types";`
- `import { decimalsFor } from "@/lib/format";` — `src/lib/format.ts:85-87`, dá 3 para JPY, 2 para XAU/BTC, 5 para o resto.
- `import { useSignals } from "@/hooks/useSignals";` → `{ signals, loading, error, refetch }`
- `import { useLivePrices } from "@/hooks/useLivePrices";` → aceita `string[]`, faz fetch a `frankfurter.app`/`coingecko.com`, devolve `prices[pair] = { price: string; change: number }` com `price === "—"` quando o par é desconhecido **ou** o fetch falha. O `useEffect` interno depende de `pairs.join(",")`, por isso passar um array literal novo a cada render é seguro.

**Rota do detalhe de sinal:** `/analises/:id` (`src/App.tsx:75`). **Não** existe `/sinais/:id`.

**Classes CSS já definidas em `src/index.css`:** `signal-buy`, `signal-sell`, `signal-wait` (definem `text-*`, `border-*/30`, `bg-*/10` mas **não** definem `border` — é preciso somar `border`). Também `font-trading` (tabular-nums), `badge-premium`, `gradient-text-gold`.

**Navbar** (`src/components/layout/Navbar.tsx:60-62`) é `fixed top-0` com `h-20` → o hero precisa de `pt-28` ou superior.

**Chaves i18n — todas as 21 verificadas em `pt.json` com valor não-vazio (14 locales, zero alterações):**

| Chave | Valor (pt) | Uso |
|---|---|---|
| `sinal.loading` | "A carregar análise…" | sr-only do skeleton |
| `sinal.notFound` | "Sinal não encontrado" | estado vazio |
| `sinal.entry` / `sinal.stopLoss` / `sinal.takeProfit` | "Entrada" / "Stop Loss" / "Take Profit" | labels dos níveis e label do preço degradado |
| `sinal.confidence` | "Confiança" | label da barra; fallback da 2.ª coluna do footer |
| `sinal.probability` | "Probabilidade" | 2.ª coluna do footer quando há `probabilityScore` |
| `sinal.riskReturn` | "Risco/Retorno" | 1.ª coluna do footer |
| `sinal.expiresIn` | "Expira em {{time}}" | 3.ª coluna do footer (interpolação; já traz o label, não duplicar) |
| `sinal.statusActive` | "● Ativo" | fallback da 3.ª coluna quando não há `expiresAt` (já traz o bullet) |
| `components.signalCard.viewFull` | "Ver Análise Completa" | botão full-width do footer |
| `inicio.heroBadge` … `inicio.statPairs` | (10 chaves) | coluna de texto |

**Erro a não repetir:** `SignalCard.tsx:68` chama `useTranslation()` depois de um return early e o lint apanha (`react-hooks/rules-of-hooks`). No componente novo, `useTranslation()` é a **primeira** linha e todos os hooks são chamados antes de qualquer `return`.

---

### Task 1: Helper puro e esqueleto do terminal

**Files:**
- Create: `src/components/home/HeroSignalTerminal.tsx`

- [ ] **Step 1: Criar o directório**

```bash
New-Item -ItemType Directory -Force -Path "src/components/home"
```

- [ ] **Step 2: Escrever o ficheiro com os helpers e os estados loading/vazio**

Criar `src/components/home/HeroSignalTerminal.tsx` com exactamente este conteúdo:

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Clock, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useLivePrices } from "@/hooks/useLivePrices";
import { useSignals } from "@/hooks/useSignals";
import { decimalsFor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/types";

const PANEL = "rounded-xl border border-border/60 bg-card p-5 sm:p-6";

/** Sinal mais recente e mais confiante para o hero. Puro e testável. */
export function pickHeroSignal(signals: Signal[]): Signal | undefined {
  const createdAt = (s: Signal): number => {
    const n = Date.parse(s.createdAt);
    return Number.isFinite(n) ? n : 0;
  };

  return signals
    .filter((s) => s.status === "active" && s.type !== "AGUARDAR")
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return createdAt(b) - createdAt(a);
    })[0];
}

/** R:R preferindo o valor do servidor; cai para o cálculo se ausente/inválido. */
export function computeRR(signal: Signal): number | null {
  if (typeof signal.riskReward === "number" && signal.riskReward > 0) {
    return signal.riskReward;
  }
  const risk = Math.abs(signal.entry - signal.stopLoss);
  if (risk === 0) return null;
  return Math.abs(signal.takeProfit - signal.entry) / risk;
}

export function confidenceTone(confidence: number): { bar: string; text: string } {
  if (confidence >= 80) return { bar: "bg-success", text: "text-success" };
  if (confidence >= 60) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-muted", text: "text-muted-foreground" };
}

/** Countdown isolado para só este subtree re-renderizar a cada segundo. */
function SignalCountdown({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const target = Date.parse(expiresAt);
  const valid = Number.isFinite(target);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!valid) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [valid, target]);

  if (!valid) return null;

  const total = Math.max(0, Math.floor((target - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

  return (
    <p className={cn("text-sm font-semibold font-trading", total < 1800 ? "text-warning" : "text-foreground")}>
      {t("sinal.expiresIn", { time })}
    </p>
  );
}

export function HeroSignalTerminal() {
  const { t } = useTranslation();
  const { signals, loading } = useSignals();
  const heroSignal = pickHeroSignal(signals);
  const { prices } = useLivePrices(heroSignal ? [heroSignal.pair] : []);

  if (loading) {
    return (
      <div className={cn(PANEL, "min-h-[420px] animate-pulse space-y-5")}>
        <span className="sr-only">{t("sinal.loading")}</span>
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-6 w-16 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded bg-muted" />
        <div className="h-1.5 w-full rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-9 rounded bg-muted/60" />
          <div className="h-9 rounded bg-muted/60" />
          <div className="h-9 rounded bg-muted/60" />
        </div>
        <div className="h-9 w-full rounded bg-muted/60" />
      </div>
    );
  }

  if (!heroSignal) {
    return (
      <div
        className={cn(
          PANEL,
          "flex min-h-[420px] flex-col items-center justify-center gap-3 text-center"
        )}
      >
        <Radio className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("sinal.notFound")}</p>
      </div>
    );
  }

  return <div className={PANEL} data-signal-id={heroSignal.id} />;
}
```

- [ ] **Step 3: Gate de typecheck**

Run: `npx tsc -b --noEmit`
Expected: exit 0, sem output. O comando `tsc -b` usa cache incremental; se não recompilar, usar `npx tsc -b --noEmit --force`.

- [ ] **Step 4: Gate de lint**

Run: `npx eslint src/components/home/HeroSignalTerminal.tsx`
Expected: `0 problems`.

> Nota: `SignalIcon` **não existe** no lucide-react 0.462 — daí o `Radio`. `Signal` existe mas colide com o `import type { Signal }`.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HeroSignalTerminal.tsx
git commit -m "feat(home): helper pickHeroSignal e estados base do terminal do hero"
```

---

### Task 2: Conteúdo do painel

**Files:**
- Modify: `src/components/home/HeroSignalTerminal.tsx` (substituir o `return` final do Task 1)

- [ ] **Step 1: Substituir o return de placeholder pelo painel completo**

No fim do ficheiro, substituir:

```tsx
  return <div className={PANEL} data-signal-id={heroSignal.id} />;
}
```

por:

```tsx
  const direction = DIRECTION[heroSignal.type];
  const DirectionIcon = direction.Icon;
  const tone = confidenceTone(heroSignal.confidence);
  const rr = computeRR(heroSignal);
  const digits = decimalsFor(heroSignal.pair);
  const quote = prices[heroSignal.pair];
  const hasLivePrice = Boolean(quote && quote.price !== "—");

  const levels = [
    { key: "entry", label: t("sinal.entry"), value: heroSignal.entry, className: "text-foreground" },
    { key: "sl", label: t("sinal.stopLoss"), value: heroSignal.stopLoss, className: "text-destructive" },
    { key: "tp", label: t("sinal.takeProfit"), value: heroSignal.takeProfit, className: "text-success" },
  ];

  return (
    <div
      role="group"
      aria-label={`${heroSignal.pair} ${heroSignal.type}`}
      className={cn(PANEL, "space-y-5")}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight">{heroSignal.pair}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {heroSignal.timeframe}
            </span>
            {heroSignal.smcSetup && (
              <span className="rounded border border-accent/30 px-1.5 py-0.5 text-[11px] text-accent">
                {heroSignal.smcSetup}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold",
            direction.className
          )}
        >
          <DirectionIcon className="h-4 w-4" />
          {heroSignal.type}
        </span>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {hasLivePrice ? heroSignal.pair : t("sinal.entry")}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold font-trading">
            {hasLivePrice ? quote.price : heroSignal.entry.toFixed(digits)}
          </span>
          {hasLivePrice && (
            <span
              className={cn(
                "text-xs font-semibold",
                quote.change > 0 ? "text-success" : quote.change < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {quote.change > 0 ? "+" : ""}
              {quote.change.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">
            {t("sinal.confidence")}
          </span>
          <span className={cn("font-semibold font-trading", tone.text)}>
            {heroSignal.confidence}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", tone.bar)}
            style={{ width: `${Math.min(100, Math.max(0, heroSignal.confidence))}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-border/40 overflow-hidden rounded-lg bg-secondary/40">
        {levels.map((level) => (
          <div key={level.key} className="flex items-center justify-between px-3 py-2.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {level.label}
            </span>
            <span className={cn("text-sm font-semibold font-trading", level.className)}>
              {level.value.toFixed(digits)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border/50 pt-4">
        <div className="grid grid-cols-3 divide-x divide-border/40">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("sinal.riskReturn")}
            </p>
            <p
              className={cn(
                "text-sm font-bold font-trading",
                rr == null ? "text-muted-foreground" : rr >= 2 ? "text-success" : "text-warning"
              )}
            >
              {rr == null ? "—" : `1:${rr.toFixed(1)}`}
            </p>
          </div>
          <div className="px-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {heroSignal.probabilityScore != null
                ? t("sinal.probability")
                : t("sinal.confidence")}
            </p>
            <p className="text-sm font-bold font-trading text-foreground">
              {heroSignal.probabilityScore != null
                ? `${heroSignal.probabilityScore}%`
                : `${heroSignal.confidence}%`}
            </p>
          </div>
          <div className="pl-3">
            {heroSignal.expiresAt ? (
              <SignalCountdown expiresAt={heroSignal.expiresAt} />
            ) : (
              <p className="text-sm font-semibold text-success">{t("sinal.statusActive")}</p>
            )}
          </div>
        </div>

        <Link
          to={`/analises/${heroSignal.id}`}
          className="mt-4 flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {t("components.signalCard.viewFull")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Acrescentar `DIRECTION` e o import em falta**

No topo do ficheiro, substituir a linha de imports do lucide por:

```tsx
import { ChevronRight, Clock, SignalIcon, TrendingDown, TrendingUp } from "lucide-react";
```

e acrescentar `Link` do router:

```tsx
import { Link } from "react-router-dom";
```

Imediatamente depois da constante `PANEL`, acrescentar:

```tsx
const DIRECTION = {
  BUY: { className: "signal-buy border", Icon: TrendingUp },
  SELL: { className: "signal-sell border", Icon: TrendingDown },
  AGUARDAR: { className: "signal-wait border", Icon: Clock },
} as const;
```

- [ ] **Step 3: Gate de typecheck**

Run: `npx tsc -b --noEmit --force`
Expected: exit 0, sem output.

- [ ] **Step 4: Gate de lint**

Run: `npx eslint src/components/home/HeroSignalTerminal.tsx`
Expected: `0 problems`.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HeroSignalTerminal.tsx
git commit -m "feat(home): painel de terminal com preco, niveis e R:R no hero"
```

---

### Task 3: Hero de duas colunas no Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx:5` (imports), `src/pages/Index.tsx:57-120` (hero)

- [ ] **Step 1: Actualizar os imports**

Em `src/pages/Index.tsx`, substituir as linhas 1-11 por:

```tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingUp, Brain, Shield, Crown, ChevronRight, BarChart3, Zap, Target, Flame, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { HeroSignalTerminal } from "@/components/home/HeroSignalTerminal";
import { cn } from "@/lib/utils";
import { useSignals } from "@/hooks/useSignals";
import { useBoomHours } from "@/hooks/useBoomHours";
import { useHistory } from "@/hooks/useHistory";
```

- [ ] **Step 2: Substituir o hero**

Substituir o bloco inteiro desde `{/* Hero */}` (linha 57) até ao `</section>` que fecha o hero (linha 120) por:

```tsx
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(34,197,94,0.10),transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(34,197,94,0.07),transparent_60%)]"
        />

        <div className="container mx-auto px-4 pt-28 pb-20 lg:pt-32 lg:pb-24 lg:flex lg:min-h-[86vh] lg:items-center">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2"
              >
                <span className="h-2 w-2 rounded-full bg-success ring-4 ring-success/15" />
                <span className="text-sm font-medium">{t("inicio.heroBadge")}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.06 }}
                className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]"
              >
                {t("inicio.heroTitle1")}{" "}
                <span className="text-primary">{t("inicio.heroTitle2")}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
              >
                {t("inicio.heroSubtitle")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <Button variant="default" size="xl" className="w-full sm:w-auto" asChild>
                  <Link to="/analises">
                    <TrendingUp />
                    {t("inicio.heroCtaLive")}
                  </Link>
                </Button>
                <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
                  <Link to="/planos">
                    {t("inicio.heroCtaPlans")}
                    <ChevronRight />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.24 }}
                className="mt-12 grid grid-cols-2 gap-y-6 border-t border-border/50 pt-6 sm:grid-cols-4"
              >
                {displayStats.map((stat, i) => (
                  <div
                    key={i}
                    className={cn(
                      "sm:border-l sm:border-border/50 sm:pl-6",
                      i === 0 && "sm:border-l-0 sm:pl-0"
                    )}
                  >
                    <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="lg:col-span-5"
            >
              <HeroSignalTerminal />
            </motion.div>
          </div>
        </div>
      </section>
```

**Removido** (verificar com grep depois): `magic-bg.svg`, os dois `motion.div` com `blur-3xl`, `animate-ping`, `gradient-shield`, `min-h-[90vh]`, `via-background/50`, `variant="hero"` no CTA primário do hero.

**Três armadilhas de CSS/HTML já resolvidas no código acima — não reintroduzir:**

1. **Gradiente com `/` num valor arbitrário.** `bg-[radial-gradient(...,hsl(142_70%_45%/0.10),...)]` é ambíguo para o parser do Tailwind e falha em silêncio (classe não gerada, sem fundo). Por isso o gradiente usa `rgba(34,197,94,0.10)` — o mesmo verde de `--primary`, sem `/`.
2. **Conflito `sm:pl-6` vs `sm:pl-0`.** A ordenação interna do Tailwind coloca `pl-0` **antes** de `pl-6`, por isso as duas classes juntas fariam o primeiro stat ficar com `pl-6`. Resolvido com `cn()` (que usa `tailwind-merge`, confirmado em `src/lib/utils.ts:5`) para o `sm:pl-0` vencer.
3. **Ícones dentro de `<Button>`.** O `buttonVariants` inclui `[&_svg]:size-4` (`src/components/ui/button.tsx:8`), cuja especificidade ganha a qualquer `h-5 w-5` no ícone. Por isso os CTAs usam `asChild` com `<Link>` como filho (HTML válido — evita `<button>` dentro de `<a>`) e deixam o ícone sem classe de tamanho.

**Mantido intacto:** o cálculo de `winRate`, `avgRR`, `totalPairs`, `displayStats` (linhas 30-53) e todas as secções abaixo do hero.

- [ ] **Step 3: Gate de typecheck**

Run: `npx tsc -b --noEmit --force`
Expected: exit 0, sem output.

- [ ] **Step 4: Gate de lint**

Run: `npx eslint src/pages/Index.tsx src/components/home/HeroSignalTerminal.tsx`
Expected: `0 problems`.

- [ ] **Step 5: Confirmar que a decoração foi removida**

Run:
```bash
Select-String -Path "src/pages/Index.tsx" -Pattern "magic-bg|blur-3xl|animate-ping|gradient-shield|min-h-\[90vh"
```
Expected: **sem qualquer resultado**.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(home): hero de duas colunas com terminal, sem orbes nem ping"
```

---

### Task 4: Motion responsável e revisão de acessibilidade

**Files:**
- Modify: `src/components/home/HeroSignalTerminal.tsx`
- Modify: `src/pages/Index.tsx` (bloco do hero)

- [ ] **Step 1: Respeitar `prefers-reduced-motion` no Index**

Em `src/pages/Index.tsx`, alterar o import de framer-motion para:

```tsx
import { motion, useReducedMotion } from "framer-motion";
```

E dentro do componente `Index`, antes do `return`, acrescentar:

```tsx
  const reduceMotion = useReducedMotion();
```

Em seguida, em cada um dos cinco `motion.*` do hero, envolver as props de animação. Padrão a aplicar em cada bloco:

```tsx
initial={reduceMotion ? false : { opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.06 }}
```

Aplicar o mesmo aos blocos com `delay: 0`, `0.12`, `0.18`, `0.24` e `0.3`, mantendo os respective delays. Não alterar o `className` de nenhum bloco.

- [ ] **Step 2: Animar a barra de confiança uma única vez**

Em `src/components/home/HeroSignalTerminal.tsx`, substituir o `<div>` da barra de confiança:

```tsx
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", tone.bar)}
            style={{ width: `${Math.min(100, Math.max(0, heroSignal.confidence))}%` }}
          />
        </div>
```

por:

```tsx
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, heroSignal.confidence))}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className={cn("h-full rounded-full", tone.bar)}
          />
        </div>
```

E acrescentar `useReducedMotion` aos imports de framer-motion no componente, mais `const reduceMotion = useReducedMotion();` depois de `const { t } = useTranslation();`.

- [ ] **Step 3: Gate de typecheck**

Run: `npx tsc -b --noEmit --force`
Expected: exit 0, sem output.

- [ ] **Step 4: Gate de lint**

Run: `npx eslint src/pages/Index.tsx src/components/home/HeroSignalTerminal.tsx`
Expected: `0 problems`.

- [ ] **Step 5: Confirmar que não sobrou animação infinita no hero**

Run:
```bash
Select-String -Path "src/pages/Index.tsx","src/components/home/HeroSignalTerminal.tsx" -Pattern "repeat: Infinity|animate-ping|animate-bounce|animate-spin"
```
Expected: **sem qualquer resultado**.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx src/components/home/HeroSignalTerminal.tsx
git commit -m "fix(home): respeitar prefers-reduced-motion e animar barra sem loop"
```

---

### Task 5: Verificação final

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc -b --noEmit --force`
Expected: exit 0, sem output.

- [ ] **Step 2: Lint dos ficheiros tocados**

Run: `npx eslint src/pages/Index.tsx src/components/home/HeroSignalTerminal.tsx`
Expected: `0 problems`.

- [ ] **Step 3: Build de produção**

Run: `npm run build`
Expected: exit 0. Se falhar com erro de chunk ou de tipos, corrigir e repetir. Não ignorar warnings de tipo.

- [ ] **Step 4: Confirmar que nenhum locale foi tocado**

Run:
```bash
git diff main --name-only -- src/lib/i18n src/index.css tailwind.config.ts src/components/ui
```
Expected: **sem output**. Se aparecer qualquer ficheiro, foi_scope creep — reverter.

- [ ] **Step 5: Inspecção visual com o dev server**

Run: `npm run dev` (deixar em background)

Depois, com Playwright, em `/`:
1. `1440x900` tema dark — confirmar: sem orbes, sem `ping`; H1 branco com `heroTitle2` a verde sólido e sem gradiente; CTA primário verde sólido; 4 stats alinhados à esquerda com divisores verticais; terminal visível à direita com par, tag BUY/SELL, preço, barra de confiança, 3 linhas de níveis e footer com R:R + link.
2. `1440x900` tema light — o mesmo, mais o fundo claro sem o radial verde escuro.
3. `390x844` (mobile) — as colunas empilham, sem scroll horizontal, o terminal aparece por baixo do texto.
4. Confirmar ausência de layout shift quando o skeleton troca para o painel.

Expected em todos: sem overflow horizontal, sem texto cortado, hierarquia legível.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore(home): verificacao final do redesign do hero"
```

Se `git status` já estiver limpo (porque os commits anteriores apanharam tudo), saltar este passo.
