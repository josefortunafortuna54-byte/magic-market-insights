import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Clock, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useLivePrices } from "@/hooks/useLivePrices";
import { useSignals } from "@/hooks/useSignals";
import { decimalsFor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/types";

const PANEL = "rounded-xl border border-border/60 bg-card p-5 sm:p-6";

const DIRECTION = {
  BUY: { className: "signal-buy border", Icon: TrendingUp },
  SELL: { className: "signal-sell border", Icon: TrendingDown },
  AGUARDAR: { className: "signal-wait border", Icon: Clock },
} as const;

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
    const started = Date.now();
    setNow(started);
    if (started >= target) return;
    const id = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= target) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [valid, target]);

  if (!valid) return null;

  const total = Math.max(0, Math.floor((target - now) / 1000));
  if (total <= 0) {
    return <p className="text-sm font-semibold text-success">{t("sinal.statusActive")}</p>;
  }

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
  const reduceMotion = useReducedMotion();
  const { signals, loading, error } = useSignals();
  const heroSignal = pickHeroSignal(signals);
  const { prices } = useLivePrices(heroSignal ? [heroSignal.pair] : []);

  if (loading) {
    return (
      <div role="status" className={cn(PANEL, "min-h-[600px] animate-pulse space-y-5")}>
        <span className="sr-only">{t("sinal.loading")}</span>
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-6 w-16 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded bg-muted" />
        <div className="h-1 w-full rounded-full bg-muted" />
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
          "flex min-h-[600px] flex-col items-center justify-center gap-3 text-center"
        )}
      >
        <Radio className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error ? t("analises.errorTitle") : t("sinal.notFound")}
        </p>
      </div>
    );
  }

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
      className={cn(PANEL, "min-h-[600px] space-y-5")}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight">{heroSignal.pair}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{heroSignal.timeframe}</Badge>
            {heroSignal.smcSetup && (
              <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                {heroSignal.smcSetup}
              </Badge>
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
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, heroSignal.confidence))}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className={cn("h-full rounded-full", tone.bar)}
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
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="min-w-0 break-words text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("sinal.riskReturn")}
            </p>
            <p
              className={cn(
                "shrink-0 text-sm font-bold font-trading",
                rr == null ? "text-muted-foreground" : rr >= 2 ? "text-success" : "text-warning"
              )}
            >
              {rr == null ? "—" : `1:${rr.toFixed(1)}`}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="min-w-0 break-words text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {heroSignal.probabilityScore != null
                ? t("sinal.probability")
                : t("sinal.confidence")}
            </p>
            <p className="shrink-0 text-sm font-bold font-trading text-foreground">
              {heroSignal.probabilityScore != null
                ? `${heroSignal.probabilityScore}%`
                : `${heroSignal.confidence}%`}
            </p>
          </div>
          {heroSignal.expiresAt ? (
            <SignalCountdown expiresAt={heroSignal.expiresAt} />
          ) : (
            <p className="text-sm font-semibold text-success">{t("sinal.statusActive")}</p>
          )}
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
