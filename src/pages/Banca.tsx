import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Coins,
  FileBarChart,
  FileText,
  Flag,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CapitalSimulatorCard } from "@/components/banca/CapitalSimulatorCard";
import { ContractCard } from "@/components/banca/ContractCard";
import { GoalReached } from "@/components/banca/GoalReached";
import { GrowthPlanSection, planNameKey } from "@/components/banca/GrowthPlanSection";
import { ManagementEnded } from "@/components/banca/ManagementEnded";
import { WithdrawModal } from "@/components/banca/WithdrawModal";
import { useBanca } from "@/hooks/useBanca";
import { useCapitalAccount } from "@/hooks/useCapitalAccount";
import { useCapitalContract } from "@/hooks/useCapitalContract";
import { useMovements } from "@/hooks/useMovements";
import { useSubscription } from "@/hooks/useSubscription";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { formatBancaMoney, formatShortDate } from "@/lib/format";
import {
  contractEnded,
  dailyGain,
  progressPct,
  profit as calcProfit,
  profitPct as calcProfitPct,
  withdrawable,
} from "@/lib/capital";
import { submitWithdrawalRequest, type WithdrawalRequest } from "@/lib/adminApi";
import { PAYMENT_METHODS, PLAN_RETURN_PCT, type Currency, type PaymentMethod } from "@/lib/plans";
import type { CapitalPlanId } from "@/lib/types";
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
  const { config, loading: bancaLoading } = useBanca();
  const {
    account,
    reports,
    loading: accountLoading,
    error: accountError,
    refetch: refetchAccount,
  } = useCapitalAccount();
  const { addMovement } = useMovements();
  const {
    contract,
    loading: contractLoading,
    error: contractError,
    refetch: refetchContract,
  } = useCapitalContract();
  const {
    requests: withdrawalRequests,
    loading: withdrawalsLoading,
    error: withdrawalsError,
    refetch: refetchWithdrawals,
  } = useWithdrawalRequests();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  const dataLoading =
    subLoading || bancaLoading || accountLoading || contractLoading || withdrawalsLoading;
  const dataError = accountError ?? contractError ?? withdrawalsError ?? null;
  const refetchAll = () => {
    void refetchAccount();
    void refetchContract();
    void refetchWithdrawals();
  };

  if (dataLoading) {
    return (
      <Layout>
        <section
          className="container mx-auto max-w-3xl space-y-6 px-4 py-8"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">{t("common.loading")}</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
        </section>
      </Layout>
    );
  }

  if (dataError) {
    return (
      <Layout>
        <section className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
          <h1 className="font-display text-2xl font-bold">{t("capital.title")}</h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {t("capital.loadError")}
              </p>
              <Button variant="secondary" onClick={refetchAll}>
                {t("capital.retry")}
              </Button>
            </CardContent>
          </Card>
        </section>
      </Layout>
    );
  }

  const capital = account?.capital ?? config.capital;
  const current = account?.achieved ?? config.achieved;
  const cur: Currency = (account?.currency ?? config.currency ?? "usd") as Currency;
  const totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn;

  const activeContract = contract && contract.status === "active" ? contract : null;
  const contractRunning = !!activeContract && !contractEnded(activeContract.end_date);
  const contractFinished = !!contract && !contractRunning;

  const planId = (activeContract?.plan_id ?? config.planId ?? "conservador") as CapitalPlanId;
  const returnPct = PLAN_RETURN_PCT[planId] ?? config.metaPercent ?? 25;

  const profitValue = calcProfit(current, capital);
  const profitPctValue = calcProfitPct(current, capital);
  const isProfit = profitValue >= 0;
  const targetValue = capital * (returnPct / 100);
  const progress = progressPct(current, capital, returnPct);
  const missingPct = Math.max(0, 100 - progress);
  const goalReached = targetValue > 0 && progress >= 100 && !contractFinished;

  const latestReport = reports[0] ?? null;
  const latestDailyGain = latestReport ? dailyGain(latestReport) : 0;
  const recentReports = reports.slice(0, 3);

  const hasManagement = Boolean(account) || capital > 0 || current > 0;
  const managedActive = hasManagement && !contractFinished && !goalReached;

  // Um utilizador com gestão de capital ATIVA vê sempre os seus dados, mesmo sem
  // subscrição "premium" — a autorização real é do servidor (RLS + edge functions).
  // O PremiumLock só aparece a quem não tem acesso nem gestão em curso.
  if (!canAccessBanca && !hasManagement) {
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

  const pendingWithdrawalTotal = withdrawalRequests
    .filter((r) => r.currency === cur && (r.status === "pending" || r.status === "approved"))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const maxWithdrawable = Math.max(0, withdrawable(current) - pendingWithdrawalTotal);
  const signedMoney = (n: number) => `${n >= 0 ? "+" : "−"}${formatBancaMoney(Math.abs(n), cur)}`;
  const signedPct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

  const submitWithdrawal = async (input: {
    method: PaymentMethod;
    amount: number;
    details: string;
    currency: Currency;
  }) => {
    if (input.currency === cur && input.amount > maxWithdrawable) {
      toast.error(t("capital.withdrawAboveBalance"));
      return;
    }
    setWithdrawBusy(true);
    try {
      const requestId = await submitWithdrawalRequest({
        method: input.method,
        amount: input.amount,
        currency: input.currency,
        details: input.details,
      });
      void addMovement({
        type: "withdrawal",
        method: input.method,
        amount: input.amount,
        currency: input.currency,
        status: "pendente",
        notes: input.details,
        ...(requestId ? { requestId } : {}),
      });
      setWithdrawOpen(false);
      void refetchWithdrawals();
      toast.success(t("depositos.confirmWithdrawOk"), {
        description: t("depositos.confirmWithdrawMsg"),
      });
    } catch (error) {
      toast.error(t("capital.withdrawErrorTitle"), {
        description:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
              ? error.message
              : t("capital.withdrawErrorMsg"),
      });
    } finally {
      setWithdrawBusy(false);
    }
  };

  const steps = [
    { icon: Wallet, color: PROVIDER_COLORS.success, title: t("capital.step1Title"), desc: t("capital.step1Desc") },
    { icon: TrendingUp, color: PROVIDER_COLORS.accent, title: t("capital.step2Title"), desc: t("capital.step2Desc") },
    { icon: Coins, color: PROVIDER_COLORS.warning, title: t("capital.step3Title"), desc: t("capital.step3Desc") },
  ];

  const withdrawalCard = (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{t("capital.withdrawalTitle")}</p>
          <Badge className="border-success/30 bg-success/20 text-success">{t("capital.weekly")}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 px-4 py-3">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("depositos.withdrawAvailable")}
          </span>
          <span className="font-semibold text-success">
            {formatBancaMoney(maxWithdrawable, cur)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("capital.withdrawalDesc")}
        </p>
        <Button
          variant="secondary"
          className="h-[54px] w-full"
          onClick={() => setWithdrawOpen(true)}
        >
          <FileBarChart className="mr-2 h-4 w-4 text-accent" />
          {t("capital.requestWithdrawal")}
        </Button>
      </CardContent>
    </Card>
  );

  const withdrawDialog = withdrawOpen ? (
    <WithdrawModal
      available={maxWithdrawable}
      balanceCurrency={cur}
      contractEndDate={contractRunning ? contract?.end_date : undefined}
      penaltyPct={contractRunning ? contract?.penalty_pct : undefined}
      maxAmount={maxWithdrawable}
      busy={withdrawBusy}
      onClose={() => setWithdrawOpen(false)}
      onSubmit={submitWithdrawal}
    />
  ) : null;

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

  if (contractFinished) {
    return (
      <Layout>
        <section className="container mx-auto max-w-3xl space-y-4 px-4 py-8">
          <h1 className="font-display text-2xl font-bold">{t("capital.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("capital.subtitle")}</p>
          <h2 className="font-display text-xl font-bold">{t("capital.endedTitle")}</h2>
          <ManagementEnded
            finalValue={current}
            capital={capital}
            currency={cur}
            profitValue={profitValue}
            defaultPlanId={planId}
          />
          {withdrawalCard}
          {withdrawDialog}
        </section>
      </Layout>
    );
  }

  const stats = [
    { icon: Wallet, color: "text-foreground", label: t("capital.invested"), value: formatBancaMoney(capital, cur), valueColor: "text-foreground" },
    {
      icon: TrendingUp,
      color: isProfit ? "text-success" : "text-destructive",
      label: t("capital.profit"),
      value: signedMoney(profitValue),
      valueColor: isProfit ? "text-success" : "text-destructive",
    },
    { icon: Flag, color: "text-accent", label: t("capital.target"), value: `+${returnPct}%`, valueColor: "text-accent" },
    { icon: Coins, color: "text-warning", label: t("capital.withdrawn"), value: formatBancaMoney(totalWithdrawn, cur), valueColor: "text-warning" },
  ];

  const chartReports = [...reports].slice(0, 7).reverse();
  const maxBalance = Math.max(...chartReports.map((r) => r.ending_balance), 1);
  const avgDailyGain = chartReports.length
    ? chartReports.reduce((s, r) => s + dailyGain(r), 0) / chartReports.length
    : 0;

  const liabilityMeta = (status: WithdrawalRequest["status"]): { label: string; color: string } => {
    switch (status) {
      case "approved":
        return { label: t("capital.liabilityApproved"), color: PROVIDER_COLORS.accent };
      case "rejected":
        return { label: t("capital.liabilityRejected"), color: PROVIDER_COLORS.destructive };
      case "paid":
        return { label: t("capital.liabilityPaid"), color: PROVIDER_COLORS.success };
      default:
        return { label: t("capital.liabilityPending"), color: PROVIDER_COLORS.warning };
    }
  };

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
            <StatusPill
              label={goalReached ? t("capital.goalReachedTitle") : managedActive ? t("capital.active") : t("capital.contractEnded")}
              color={goalReached || managedActive ? PROVIDER_COLORS.success : PROVIDER_COLORS.warning}
            />
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
              {signedMoney(profitValue)} ({signedPct(profitPctValue)})
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  goalReached || managedActive ? "bg-success/10 text-success" : "bg-warning/15 text-warning",
                )}
              >
                <ShieldCheck className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">
                  {goalReached ? t("capital.goalReachedTitle") : managedActive ? t("capital.managedActive") : t("capital.managedEnded")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {contract ? t(planNameKey[planId]) : t("capital.step2Desc")}
                </p>
              </div>
            </div>
            <StatusPill
              label={goalReached ? t("capital.goalReachedTitle") : managedActive ? t("capital.active") : t("capital.contractEnded")}
              color={goalReached || managedActive ? PROVIDER_COLORS.success : PROVIDER_COLORS.warning}
            />
          </CardContent>
        </Card>

        {latestReport ? (
          <Card>
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
                  {`${latestReport.profit >= 0 ? "+" : "−"}${Math.abs(latestReport.profit_pct).toFixed(1)}%`}
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
                  {signedMoney(latestReport.profit)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("capital.dailyGain")}</p>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    latestDailyGain >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {signedMoney(latestDailyGain)}
                </p>
              </div>
              {latestReport.note ? (
                <p className="text-xs text-muted-foreground">{latestReport.note}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {contract ? <ContractCard contract={contract} goalReached={goalReached} /> : null}

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

        {targetValue > 0 && progress >= 100 && !contractFinished ? (
          <GoalReached
            finalValue={current}
            currency={cur}
            returnPct={returnPct}
            profitValue={profitValue}
            onWithdraw={() => setWithdrawOpen(true)}
          />
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("capital.progressTitle")}</p>
                <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label={t("capital.progressTitle")}
              >
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{signedMoney(profitValue)}</p>
                <p className="text-xs font-semibold text-accent">
                  {t("capital.target")}: +{formatBancaMoney(targetValue, cur)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("capital.progressMissing")}</p>
                <p className="text-xs font-semibold">{Math.round(missingPct)}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        {chartReports.length > 0 ? (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("capital.chartTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("capital.dailyGain")}: {signedMoney(avgDailyGain)}
                </p>
              </div>
              <div className="flex items-end gap-1.5">
                {chartReports.map((r) => (
                  <div key={r.id} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn("w-full rounded", r.profit >= 0 ? "bg-success" : "bg-destructive")}
                      style={{ height: Math.max(4, (r.ending_balance / maxBalance) * 72) }}
                    />
                    <span className="text-[9px] text-muted-foreground">{formatShortDate(r.period_end)}</span>
                  </div>
                ))}
              </div>
              {recentReports.length > 0 ? (
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t("capital.recentReports")}</p>
                  {recentReports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{formatShortDate(r.period_end)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("capital.dailyGain")}: {signedMoney(dailyGain(r))}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          r.profit >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {signedMoney(r.profit)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId} />

        {withdrawalCard}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="font-semibold">{t("capital.liabilitiesTitle")}</p>
            {withdrawalRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("capital.liabilitiesEmpty")}</p>
            ) : (
              withdrawalRequests.slice(0, 10).map((r) => {
                const method = PAYMENT_METHODS.find((m) => m.id === r.method);
                const meta = liabilityMeta(r.status);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{method?.label ?? r.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBancaMoney(r.amount, r.currency as Currency)} · {formatShortDate(r.created_at)}
                      </p>
                    </div>
                    <StatusPill label={meta.label} color={meta.color} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <GrowthPlanSection
          capital={capital}
          currency={cur}
          achieved={current}
          profitValue={profitValue}
          returnPct={returnPct}
          goalReached={goalReached}
          onWithdraw={() => setWithdrawOpen(true)}
        />

        {withdrawDialog}
      </section>
    </Layout>
  );
}
