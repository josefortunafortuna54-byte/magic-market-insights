import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Rocket,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PaymentModal } from "@/components/banca/PaymentModal";
import { ReceiptSuccessModal } from "@/components/banca/ReceiptSuccessModal";
import { useAuth } from "@/contexts/AuthContext";
import { useBanca } from "@/hooks/useBanca";
import { useMovements, type WalletMovement } from "@/hooks/useMovements";
import { supabase } from "@/lib/supabaseClient";
import { uploadReceipt, type ReceiptFile } from "@/lib/payments";
import { saveReceipt, submitWithdrawalRequest } from "@/lib/adminApi";
import { notifyPlanRequestSubmitted } from "@/lib/planRequests";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_ICONS,
  PLANS,
  PLAN_PRICES,
  PRICES,
  planLabel,
  type Currency,
  type PaymentMethod,
  type PlanId,
} from "@/lib/plans";
import { formatBancaMoney, formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TabId = "deposit" | "withdraw";

const PLAN_ICONS: Record<Exclude<PlanId, "free">, typeof Zap> = {
  basic: Zap,
  pro: Rocket,
  premium: Trophy,
};

const getReceiptInbox = (): ReceiptFile | null => {
  try {
    const raw = localStorage.getItem("payment_receipt_inbox");
    return raw ? (JSON.parse(raw) as ReceiptFile) : null;
  } catch {
    return null;
  }
};

const clearReceiptInbox = () => {
  try {
    localStorage.removeItem("payment_receipt_inbox");
  } catch {
    /* ignore */
  }
};

// Verifica se o comprovativo ficou realmente registado no servidor. Usado
// para evitar falsos negativos (insert que foi confirmado mas a resposta
// perdeu-se na rede) e falsos sucessos (erro silencioso).
const receiptRegisteredOnServer = async (userId: string, proofUrl: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from("payment_receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("proof_url", proofUrl);
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
};

const formatMovementAmount = (amount: number, curr: Currency) =>
  curr === "usd" ? `$${formatMoney(amount)}` : `${formatMoney(amount)} Kz`;

export default function Depositos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { config: banca } = useBanca();
  const { movements, loading, addMovement, deleteMovement } = useMovements();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = {
    plan: searchParams.get("plan") ?? undefined,
    currency: searchParams.get("currency") ?? undefined,
    amount: searchParams.get("amount") ?? undefined,
  };

  const [activeTab, setActiveTab] = useState<TabId>("deposit");
  const [plan, setPlan] = useState<Exclude<PlanId, "free">>(
    params.plan && PLANS.some((p) => p.id === params.plan)
      ? (params.plan as Exclude<PlanId, "free">)
      : "basic",
  );
  const [currency, setCurrency] = useState<Currency>(params.currency === "aoa" ? "aoa" : "usd");
  const [depositModal, setDepositModal] = useState<{
    method?: PaymentMethod;
    initialProof?: ReceiptFile | null;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [showReceiptSuccess, setShowReceiptSuccess] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDetails, setWithdrawDetails] = useState("");

  useEffect(() => {
    const p = searchParams.get("plan");
    const c = searchParams.get("currency") as Currency | null;
    if (p && PLANS.some((pl) => pl.id === p)) setPlan(p as Exclude<PlanId, "free">);
    if (c === "aoa" || c === "usd") setCurrency(c);
  }, [searchParams]);

  useEffect(() => {
    const inbox = getReceiptInbox();
    if (!inbox) return;
    clearReceiptInbox();
    setDepositModal((prev) => prev ?? { initialProof: inbox });
  }, []);

  const parsedCustomAmount = params.amount ? parseFloat(params.amount.replace(",", ".")) : NaN;
  const customAmount =
    isFinite(parsedCustomAmount) && parsedCustomAmount > 0 ? parsedCustomAmount : null;
  const isCapitalDeposit = customAmount !== null;

  const availableMethods = useMemo(
    () => PAYMENT_METHODS.filter((m) => (currency === "usd" ? m.usd : m.aoa)),
    [currency],
  );

  const price = PRICES[currency][plan];
  const planPrice = PLAN_PRICES[currency][plan];
  const currencySymbol = currency === "usd" ? "USD" : "AOA";
  const selectedPlan = PLANS.find((p) => p.id === plan);

  const hasPendingDepositRequest = async (): Promise<boolean> => {
    if (user?.id) {
      const { count, error } = await supabase
        .from("payment_receipts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (!error && (count ?? 0) > 0) return true;
    }
    return movements.some((m) => m.type === "deposit" && m.status === "pendente");
  };

  const alertPendingDeposit = () => {
    toast.warning(t("depositos.pendingDepositTitle"), {
      description: t("depositos.pendingDepositMsg"),
    });
  };

  const openDepositModal = async () => {
    if (await hasPendingDepositRequest()) {
      alertPendingDeposit();
      return;
    }
    setDepositModal({});
  };

  const confirmDeposit = async (proof: ReceiptFile | null, retries = 2) => {
    if (!depositModal?.method || !proof) return;
    if (!user) {
      toast.error(t("planos.connectionError"));
      return;
    }
    if (await hasPendingDepositRequest()) {
      alertPendingDeposit();
      setDepositModal(null);
      return;
    }
    setSending(true);
    const depositAmount = customAmount ?? planPrice;
    let result: { url: string | null; error?: string } = { url: null };
    for (let attempt = 0; attempt <= retries; attempt++) {
      result = await uploadReceipt(user.id, proof);
      if (result.url) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!result.url) {
      setSending(false);
      toast.error(t("planos.connectionError"), {
        description: result.error || t("planos.retryMessage"),
        action: {
          label: t("planos.tryAgain"),
          onClick: () => confirmDeposit(proof, retries),
        },
      });
      return;
    }
    void addMovement({
      type: "deposit",
      method: depositModal.method,
      amount: depositAmount,
      currency,
      plan: isCapitalDeposit ? "capital" : plan,
      status: "pendente",
    });
    if (user) {
      const payload = {
        user_id: user.id,
        user_email: user.email ?? "",
        proof_url: result.url,
        plan: isCapitalDeposit ? "capital" : plan,
        method: depositModal.method,
        amount: depositAmount,
        currency,
      };
      // O upload já foi feito; agora regista-se a linha no servidor com retry.
      // Se um insert "falhou" mas o registo existe, considera-se sucesso.
      let saved = false;
      try {
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            await saveReceipt(payload);
            saved = true;
            break;
          } catch (err) {
            console.warn(
              "[deposito] saveReceipt falhou:",
              err instanceof Error ? err.message : err,
            );
            if (await receiptRegisteredOnServer(user.id, result.url)) {
              saved = true;
              break;
            }
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
          }
        }
      } catch (err) {
        console.warn(
          "[deposito] verificação do comprovativo falhou:",
          err instanceof Error ? err.message : err,
        );
      }
      if (!saved) {
        setSending(false);
        toast.error(t("planos.connectionError"), {
          description: t("depositos.receiptSaveError"),
          action: {
            label: t("planos.tryAgain"),
            onClick: () => confirmDeposit(proof, retries),
          },
        });
        return;
      }
      if (!isCapitalDeposit) {
        try {
          localStorage.setItem(
            "pending_plan_payment",
            JSON.stringify({ plan, amount: depositAmount, currency }),
          );
        } catch {
          /* ignore */
        }
        // Regista o pedido de ativação na caixa de notificações do utilizador.
        void notifyPlanRequestSubmitted(planLabel(plan), price);
      }
    }
    setSending(false);
    setDepositModal(null);
    setShowReceiptSuccess(true);
  };

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    if (!withdrawMethod || !isFinite(amount) || amount <= 0 || !withdrawDetails.trim()) {
      toast.error(t("depositos.invalidWithdraw"));
      return;
    }
    try {
      await submitWithdrawalRequest({
        method: withdrawMethod,
        amount,
        currency,
        details: withdrawDetails.trim(),
      });
    } catch {
      /* mantém apenas local */
    }
    void addMovement({
      type: "withdrawal",
      method: withdrawMethod,
      amount,
      currency,
      status: "pendente",
      notes: withdrawDetails.trim(),
    });
    setWithdrawAmount("");
    setWithdrawDetails("");
    setWithdrawMethod(null);
    toast.success(t("depositos.confirmWithdrawOk"), {
      description: t("depositos.confirmWithdrawMsg"),
    });
  };

  const renderMovement = (m: WalletMovement, index: number) => {
    const isDeposit = m.type === "deposit";
    const method = PAYMENT_METHODS.find((pm) => pm.id === m.method);
    const isPending = m.status === "pendente";

    const handleDelete = () => {
      if (window.confirm(t("depositos.deleteMovementMsg"))) {
        void deleteMovement(m.id);
      }
    };

    return (
      <div
        key={m.id}
        className={cn(
          "flex items-center gap-4 py-3",
          index > 0 && "border-t border-border",
        )}
      >
        <div
          className={cn(
            "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl",
            isDeposit ? "bg-success/15" : "bg-accent/15",
          )}
        >
          {isDeposit ? (
            <ArrowDownCircle className="h-[22px] w-[22px] text-success" />
          ) : (
            <ArrowUpCircle className="h-[22px] w-[22px] text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {isDeposit
              ? m.plan === "capital"
                ? t("depositos.movementCapital")
                : t("depositos.movementDeposit", { plan: planLabel(m.plan as Exclude<PlanId, "free">) })
              : t("depositos.movementWithdraw")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {method?.label} · {formatShortDate(m.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p
            className={cn(
              "font-bold",
              isDeposit ? "text-success" : "text-accent",
            )}
          >
            {`${isDeposit ? "+" : "-"}`} {formatMovementAmount(m.amount, m.currency)}
          </p>
          <div className="flex items-center gap-2">
            <Badge
              className={
                m.status === "concluido"
                  ? "bg-success/20 text-success border-success/30"
                  : m.status === "recusado"
                    ? "bg-destructive/20 text-destructive border-destructive/30"
                    : "bg-warning/20 text-warning border-warning/30"
              }
            >
              {m.status === "concluido" ? t("depositos.statusConcluido") : t("depositos.statusPendente")}
            </Badge>
            {isPending ? (
              <button
                onClick={handleDelete}
                className="text-destructive hover:opacity-80 transition-opacity"
                aria-label={t("depositos.deleteMovement")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const segment = (
    <div className="flex rounded-full bg-secondary/70 p-1">
      {(["usd", "aoa"] as const).map((c) => {
        const active = currency === c;
        return (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={cn(
              "relative flex-1 rounded-full py-2 text-sm font-bold transition-colors",
              active ? "text-background" : "text-muted-foreground",
            )}
          >
            {active ? <span className="absolute inset-0 rounded-full bg-accent shadow-lg shadow-accent/35" /> : null}
            <span className="relative">{c === "usd" ? t("planos.usd") : t("planos.aoa")}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <section className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-[#0B5C2E] p-6 shadow-xl shadow-primary/25 space-y-3">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -left-8 -bottom-16 h-44 w-44 rounded-full bg-white/5" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-[13px] font-bold tracking-widest text-white/90">{t("depositos.balance")}</span>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">
              {currencySymbol}
            </span>
          </div>
          <p className="text-4xl font-extrabold tracking-tight text-white">
            {formatBancaMoney(banca.achieved, banca.currency ?? "usd")}
          </p>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-white/65" />
            <span className="text-xs text-white/70">{t("depositos.balanceSub")}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-full bg-secondary/70 p-1">
          {[
            { id: "deposit" as TabId, icon: ArrowDownCircle, label: t("depositos.tabDeposit") },
            { id: "withdraw" as TabId, icon: ArrowUpCircle, label: t("depositos.tabWithdraw") },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-colors",
                  active ? "text-background" : "text-muted-foreground",
                )}
              >
                {active ? <span className="absolute inset-0 rounded-full bg-accent shadow-lg shadow-accent/35" /> : null}
                <tab.icon className="relative h-4 w-4" />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26 }}
          className="space-y-4"
        >
          {activeTab === "deposit" ? (
            <>
              {!isCapitalDeposit ? segment : null}
              {!isCapitalDeposit ? (
                <div className="flex flex-wrap gap-2">
                  {PLANS.map((p) => {
                    const active = plan === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlan(p.id)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                          active
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {planLabel(p.id)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-accent/15">
                      {isCapitalDeposit ? (
                        <TrendingUp className="h-5 w-5 text-accent" />
                      ) : selectedPlan ? (
                        (() => {
                          const PlanIcon = PLAN_ICONS[selectedPlan.id];
                          return <PlanIcon className="h-5 w-5 text-accent" />;
                        })()
                      ) : (
                        <Zap className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {isCapitalDeposit ? t("depositos.capitalDepositTitle") : planLabel(plan)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isCapitalDeposit
                          ? t("depositos.capitalDepositSubtitle")
                          : t("depositos.amount")}
                      </p>
                    </div>
                    <p className="text-xl font-extrabold tracking-tight">
                      {isCapitalDeposit ? formatBancaMoney(customAmount ?? 0, currency) : price}
                    </p>
                  </div>
                  <Button
                    variant={isCapitalDeposit || plan === "pro" ? "premium" : "default"}
                    className="w-full h-[54px]"
                    onClick={openDepositModal}
                  >
                    {t("depositos.depositCta", {
                      amount: isCapitalDeposit
                        ? formatBancaMoney(customAmount ?? 0, currency)
                        : price,
                    })}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs text-muted-foreground">
                      {t("depositos.secureNote")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {segment}
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("depositos.withdrawSubtitle")}
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 px-4 py-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {t("depositos.withdrawAvailable")}
                    </span>
                    <span className="font-semibold text-success">
                      {formatBancaMoney(banca.achieved, banca.currency ?? "usd")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("depositos.withdrawMethod")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableMethods.map((m) => {
                      const active = withdrawMethod === m.id;
                      const Icon = PAYMENT_METHOD_ICONS[m.icon];
                      return (
                        <button
                          key={m.id}
                          onClick={() => setWithdrawMethod(m.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
                            active
                              ? "border-accent bg-accent text-background"
                              : "border-border bg-secondary/60 text-foreground",
                          )}
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      {t("depositos.withdrawAmount", { currency: currencySymbol })}
                    </label>
                    <Input
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      {t("depositos.withdrawDetails")}
                    </label>
                    <Textarea
                      value={withdrawDetails}
                      onChange={(e) => setWithdrawDetails(e.target.value)}
                      placeholder={
                        withdrawMethod
                          ? PAYMENT_METHODS.find((m) => m.id === withdrawMethod)?.getDetails()
                          : undefined
                      }
                      rows={2}
                    />
                  </div>
                  <Button variant="secondary" className="w-full h-[54px]" onClick={submitWithdrawal}>
                    {t("depositos.withdrawCta")}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>

        {/* Histórico */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">{t("depositos.historySection")}</h2>
          {loading ? (
            <Card>
              <CardContent>
                <p className="py-4 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
              </CardContent>
            </Card>
          ) : movements.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("depositos.empty")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-0 pt-3">
                {movements.map(renderMovement)}
              </CardContent>
            </Card>
          )}
        </div>

        {depositModal ? (
          <PaymentModal
            plan={plan}
            currency={currency}
            price={price}
            onClose={() => setDepositModal(null)}
            onConfirm={confirmDeposit}
            method={depositModal.method}
            onMethodSelect={(m) =>
              setDepositModal({ method: m, initialProof: depositModal.initialProof })
            }
            availableMethods={availableMethods}
            initialProof={depositModal.initialProof ?? null}
            busy={sending}
          />
        ) : null}

        <ReceiptSuccessModal
          open={showReceiptSuccess}
          onOpenChange={setShowReceiptSuccess}
        />
      </section>
    </Layout>
  );
}