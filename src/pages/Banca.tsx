import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Coins,
  FileBarChart,
  FileText,
  Flag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CapitalSimulatorCard } from "@/components/banca/CapitalSimulatorCard";
import { GrowthPlanSection } from "@/components/banca/GrowthPlanSection";
import { useBanca } from "@/hooks/useBanca";
import { useCapitalAccount } from "@/hooks/useCapitalAccount";
import { useMovements } from "@/hooks/useMovements";
import { useSubscription } from "@/hooks/useSubscription";
import { formatBancaMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
      )}
      style={{ backgroundColor: `${color}18`, borderColor: `${color}40`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

const PROVIDER_COLORS = {
  success: "#00C853",
  warning: "#FFB020",
  destructive: "#EF4444",
  accent: "#6366F1",
};

export default function Banca() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessBanca, loading: subLoading } = useSubscription();
  const { config, loading } = useBanca();
  const { account, reports } = useCapitalAccount();
  const { movements } = useMovements();

  if (!subLoading && !canAccessBanca) {
    return (
      <Layout>
        <section className="container mx-auto max-w-3xl px-4 py-8">
          <PremiumLock
            title={t("capital.lockTitle")}
            description={t("capital.lockDesc")}
          />
        </section>
      </Layout>
    );
  }

  if (loading || subLoading) {
    return (
      <Layout>
        <section className="container mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </section>
      </Layout>
    );
  }

  const capital = account?.capital ?? config.capital;
  const current = account?.achieved ?? config.achieved;
  const cur = account?.currency ?? config.currency ?? "usd";
  const totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn;
  const latestReport = reports[0] ?? null;
  const profit = current - capital;
  const profitPct = capital > 0 ? (profit / capital) * 100 : 0;
  const isProfit = profit >= 0;
  const targetPct = config.metaPercent;
  const targetValue = capital * (targetPct / 100);
  const progressPct = targetValue > 0 ? Math.min(100, Math.max(0, (profit / targetValue) * 100)) : 0;

  const walletDeposits = movements
    .filter((m) => m.type === "deposit" && m.status !== "recusado" && m.currency === cur)
    .reduce((sum, m) => sum + m.amount, 0);
  const totalInvested = Math.max(walletDeposits, capital);

  const hasManagement = Boolean(account) || capital > 0 || current > 0;

  const steps = [
    { icon: Wallet, color: PROVIDER_COLORS.success, title: t("capital.step1Title"), desc: t("capital.step1Desc") },
    { icon: TrendingUp, color: PROVIDER_COLORS.accent, title: t("capital.step2Title"), desc: t("capital.step2Desc") },
    { icon: Coins, color: PROVIDER_COLORS.warning, title: t("capital.step3Title"), desc: t("capital.step3Desc") },
  ];

  if (!hasManagement) {
    return (
      <Layout>
        <section className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
          <h1 className="font-display text-2xl font-bold">{t("capital.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("capital.subtitle")}
          </p>

          <div className="relative space-y-3 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: PROVIDER_COLORS.accent }}>
              {t("capital.inactiveEyebrow")}
            </p>
            <p className="font-mono text-4xl font-bold tracking-wide text-foreground">+25%</p>
            <p className="text-sm text-muted-foreground">
              {t("capital.inactiveHeroDesc")}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t("capital.minDeposit")}: $50 USD</p>
              <StatusPill label={t("capital.inactiveBadge")} color={PROVIDER_COLORS.warning} />
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="font-semibold">{t("capital.howItWorks")}</p>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${step.color}18` }}
                  >
                    <step.icon className="h-[18px] w-[18px]" style={{ color: step.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <CapitalSimulatorCard
            capital={0}
            currency="usd"
            strategy={config.planId}
            onDeposit={(amount) =>
              navigate(`/depositos?amount=${String(Math.round(amount * 100) / 100)}&currency=usd`)
            }
          />
        </section>
      </Layout>
    );
  }

  const stats = [
    { icon: Wallet, color: "text-foreground", label: t("capital.invested"), value: formatBancaMoney(totalInvested, cur) },
    { icon: TrendingUp, color: "text-success", label: t("capital.profit"), value: `+${formatBancaMoney(profit, cur)}`, valueColor: "text-success" },
    { icon: Flag, color: "text-accent", label: t("capital.target"), value: `+${targetPct}%`, valueColor: "text-accent" },
    { icon: Coins, color: "text-warning", label: t("capital.withdrawn"), value: formatBancaMoney(totalWithdrawn, cur), valueColor: "text-warning" },
  ];

  return (
    <Layout>
      <section className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">{t("capital.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("capital.subtitle")}
        </p>

        <div className="relative space-y-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-success/15 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/70">
              {t("capital.currentBalance")}
            </p>
            <StatusPill label={t("capital.active")} color={PROVIDER_COLORS.success} />
          </div>
          <p
            className={cn(
              "font-mono text-4xl font-bold tracking-wide",
              isProfit ? "text-foreground" : "text-destructive",
            )}
          >
            {formatBancaMoney(current, cur)}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("capital.deposited")}{formatBancaMoney(capital, cur)}</p>
            <p className={cn("text-xs font-semibold", isProfit ? "text-success" : "text-destructive")}>
              {isProfit ? "+" : ""}
              {formatBancaMoney(profit, cur)} ({profitPct > 0 ? "+" : ""}
              {profitPct.toFixed(1)}%)
            </p>
          </div>
        </div>

        {latestReport ? (
          <Card
            className="cursor-pointer transition-colors hover:opacity-90"
            // navigate("/diario-trader") quando a página existir no web
          >
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-accent" />
                  <p className="text-sm font-semibold">{t("capital.latestReport")}</p>
                </div>
                <Badge
                  className={
                    latestReport.profit >= 0
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }
                >
                  {`${latestReport.profit >= 0 ? "+" : ""}${latestReport.profit_pct.toFixed(1)}%`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(latestReport.period_start)} – {formatShortDate(latestReport.period_end)}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    latestReport.profit >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {`${latestReport.profit >= 0 ? "+" : ""}${formatBancaMoney(latestReport.profit, cur)}`}
                </p>
              </div>
              {latestReport.note ? (
                <p className="text-xs text-muted-foreground">{latestReport.note}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col items-center gap-2 pb-6 pt-6">
                <s.icon className={cn("h-[18px] w-[18px]", s.color)} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("text-sm font-bold", s.valueColor)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("capital.progressTitle")}</p>
              <p className="text-xs text-muted-foreground">{Math.round(progressPct)}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">+{formatBancaMoney(profit, cur)}</p>
              <p className="text-xs font-semibold text-accent">
                {t("capital.target")}: +{formatBancaMoney(targetValue, cur)}
              </p>
            </div>
          </CardContent>
        </Card>

        <CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId} />

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("capital.withdrawalTitle")}</p>
              <Badge className="border-success/30 bg-success/20 text-success">{t("capital.weekly")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("capital.withdrawalDesc")}
            </p>
            <Button
              variant="secondary"
              className="h-[54px] w-full"
              onClick={() =>
                toast.info(t("capital.withdrawalRequest"), {
                  description: t("capital.withdrawalMsg"),
                })
              }
            >
              <FileBarChart className="mr-2 h-4 w-4 text-accent" />
              {t("capital.requestWithdrawal")}
            </Button>
          </CardContent>
        </Card>

        <GrowthPlanSection capital={capital} currency={cur} />
      </section>
    </Layout>
  );
}