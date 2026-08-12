import { motion } from "framer-motion";
import { Check, X, Crown, Zap, Star, CreditCard, Wallet, ShieldCheck, ArrowLeft, Upload } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaymentRequests } from "@/hooks/usePaymentRequests";
import type { PaymentMethod } from "@/hooks/usePaymentRequests";
import { getErrorMessage } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const PRICE_USD = import.meta.env.VITE_STRIPE_PRICE_USD;
const PRICE_AOA = import.meta.env.VITE_STRIPE_PRICE_AOA;

const BINANCE_ID = import.meta.env.VITE_BINANCE_ID;
const BINANCE_NETWORK = import.meta.env.VITE_BINANCE_NETWORK || "USDT (TRC20)";
const BINANCE_EMAIL = import.meta.env.VITE_BINANCE_EMAIL;
const MTX_ENTITY = import.meta.env.VITE_MULTICAIXA_ENTITY;
const MTX_REFERENCE = import.meta.env.VITE_MULTICAIXA_REFERENCE;
const MTX_IBAN = import.meta.env.VITE_MULTICAIXA_IBAN;
const PAYMENT_WHATSAPP = import.meta.env.VITE_PAYMENT_WHATSAPP;

const freeFeatures = [
  { text: "3 pares Forex (EUR/USD, GBP/USD, USD/JPY)", included: true },
  { text: "Sinais M15 apenas", included: true },
  { text: "RSI, EMA, MACD básico", included: true },
  { text: "Sinais H1 e H4", included: false },
  { text: "Todos os 8 pares Forex", included: false },
  { text: "Histórico completo", included: false },
  { text: "Alertas em tempo real", included: false },
];

const premiumFeatures = [
  { text: "Todos os 8 pares Forex", included: true },
  { text: "Sinais M15, H1 e H4", included: true },
  { text: "RSI, EMA, MACD, Bollinger, Estocástico", included: true },
  { text: "Histórico completo com pips", included: true },
  { text: "Alertas em tempo real", included: true },
  { text: "Suporte prioritário", included: true },
  { text: "Acesso antecipado a novas funcionalidades", included: true },
];

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "⏳ A aguardar confirmação", className: "bg-warning/20 text-warning border-warning/30" },
  approved: { text: "✅ Aprovado", className: "bg-success/20 text-success border-success/30" },
  rejected: { text: "❌ Rejeitado", className: "bg-destructive/20 text-destructive border-destructive/30" },
  cancelled: { text: "Cancellado", className: "bg-secondary text-muted-foreground border-border/40" },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  binance: "Binance (USDT)",
  multicaixa: "Multicaixa Express",
};

function formatAmount(currency: "usd" | "aoa") {
  return currency === "usd" ? "$29.99" : "20.000 Kz";
}

export default function Planos() {
  const { user, isPremium, loading, checkout } = useSubscription();
  const { payments, submit } = usePaymentRequests(user?.id);
  const [searchParams] = useSearchParams();
  const [currency, setCurrency] = useState<"usd" | "aoa">("usd");
  const [checkingOut, setCheckingOut] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const handleStripeCheckout = async () => {
    setCheckingOut(true);
    const priceId = currency === "usd" ? PRICE_USD : PRICE_AOA;
    if (!priceId) {
      alert("Configuração de pagamento em falta. Contacta o suporte.");
      setCheckingOut(false);
      return;
    }
    await checkout(priceId, currency);
    setCheckingOut(false);
  };

  const manualReady =
    method === "binance" ? !!BINANCE_ID : method === "multicaixa" ? !!MTX_ENTITY && !!MTX_REFERENCE : false;

  const handleManualSubmit = async () => {
    setSubmitError(null);
    if (!user) { window.location.href = "/login"; return; }
    if (!manualReady) { setSubmitError("Método ainda não configurado. Contacta o suporte."); return; }
    if (!transactionId.trim()) { setSubmitError("Indica o ID da transação."); return; }
    if (!proofFile) { setSubmitError("Anexa o comprovativo de pagamento."); return; }

    setSubmitting(true);
    try {
      await submit({
        method: method as PaymentMethod,
        currency,
        amount: currency === "usd" ? 29.99 : 20000,
        transactionId: transactionId.trim(),
        file: proofFile,
      });
      setTransactionId("");
      setProofFile(null);
      setMethod(null);
    } catch (e: unknown) {
      setSubmitError("Erro ao enviar: " + getErrorMessage(e));
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <section className="pt-12 pb-6">
        <div className="container mx-auto px-4">
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 mb-8 border-success/30 bg-success/5 text-center">
              <p className="text-success font-semibold">🎉 Subscrição ativada com sucesso! Bem-vindo ao Premium!</p>
            </motion.div>
          )}
          {canceled && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 mb-8 border-warning/30 bg-warning/5 text-center">
              <p className="text-warning">Pagamento cancelado. Podes tentar novamente a qualquer momento.</p>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 text-sm">
              <Star className="h-4 w-4 text-primary" />
              Planos
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Escolha o plano ideal para você
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comece gratuitamente ou desbloqueie todo o potencial com o Premium.
            </p>
          </motion.div>

          {/* Seletor de moeda */}
          <div className="flex justify-center mb-10">
            <div className="glass-card p-1 flex gap-1">
              <button onClick={() => setCurrency("usd")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currency === "usd" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                USD ($)
              </button>
              <button onClick={() => setCurrency("aoa")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currency === "aoa" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                AOA (Kz)
              </button>
            </div>
          </div>

          {/* Cards de planos */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Gratuito */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Gratuito</h2>
                  <p className="text-xs text-muted-foreground">Para começar</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {f.included
                      ? <Check className="h-4 w-4 text-success shrink-0" />
                      : <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/50 line-through"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl border border-border/60 text-muted-foreground text-sm font-medium hover:bg-secondary/60 transition-all">
                {user ? "Plano Atual" : "Começar Grátis"}
              </button>
            </motion.div>

            {/* Premium */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="glass-card p-8 border-primary/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="badge-premium">
                  <Crown className="h-3 w-3" />
                  Mais Popular
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Premium</h2>
                  <p className="text-xs text-muted-foreground">Acesso completo</p>
                </div>
              </div>

              <div className="mb-6 relative">
                <span className="font-display text-4xl font-bold gradient-text">{formatAmount(currency)}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="space-y-3 mb-8 relative">
                {premiumFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 relative">
                {isPremium ? (
                  <div className="w-full py-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm font-medium text-center">
                    ✓ Plano Ativo
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleStripeCheckout}
                      disabled={checkingOut || loading}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-primary)" }}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {checkingOut ? "A redirecionar..." : user ? "Assinar com Cartão (Stripe)" : "Criar Conta e Assinar"}
                      </span>
                    </button>

                    <button
                      onClick={() => { if (!user) { window.location.href = "/login"; return; } setMethod(method === "binance" ? null : "binance"); }}
                      className="w-full py-3 rounded-xl border border-warning/40 bg-warning/5 text-warning text-sm font-semibold hover:bg-warning/10 transition-all"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {method === "binance" ? "Fechar Binance" : "Pagar com Binance (USDT)"}
                      </span>
                    </button>

                    <button
                      onClick={() => { if (!user) { window.location.href = "/login"; return; } setMethod(method === "multicaixa" ? null : "multicaixa"); }}
                      className="w-full py-3 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-all"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {method === "multicaixa" ? "Fechar Multicaixa Express" : "Pagar com Multicaixa Express"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Formulário de pagamento manual */}
          {method && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mt-10 glass-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Pagar com {METHOD_LABEL[method]} — {formatAmount(currency)}
                </h2>
                <button onClick={() => setMethod(null)} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              </div>

              <div className={`rounded-xl border p-5 mb-6 ${manualReady ? "border-primary/30 bg-primary/5" : "border-warning/40 bg-warning/5"}`}>
                <p className="font-semibold mb-2 text-sm">📋 Passos para pagar</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {method === "binance" ? (
                    <>
                      <li>Envia <strong>{formatAmount(currency)}</strong> para o ID Binance: <strong className="text-foreground">{BINANCE_ID || "—"}</strong></li>
                      {BINANCE_EMAIL && <li>Rede: <strong className="text-foreground">{BINANCE_NETWORK}</strong></li>}
                      {BINANCE_EMAIL && <li>Email associado: <strong className="text-foreground">{BINANCE_EMAIL}</strong></li>}
                    </>
                  ) : (
                    <>
                      <li>Faça a transferência Multicaixa Express de <strong>{formatAmount(currency)}</strong> com os dados abaixo.</li>
                      <li>Entidade: <strong className="text-foreground">{MTX_ENTITY || "—"}</strong> · Referência: <strong className="text-foreground">{MTX_REFERENCE || "—"}</strong></li>
                      {MTX_IBAN && <li>IBAN: <strong className="text-foreground">{MTX_IBAN}</strong></li>}
                    </>
                  )}
                  <li>Anexa o comprovativo (screenshot) e o ID da transação abaixo.</li>
                  {PAYMENT_WHATSAPP && (
                    <li>Precisas de ajuda? WhatsApp: <strong className="text-foreground">{PAYMENT_WHATSAPP}</strong></li>
                  )}
                </ol>
                {!manualReady && (
                  <p className="mt-3 text-xs text-warning">⚠️ Este método ainda não está configurado. Contacta o suporte.</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ID da transação *</label>
                  <input value={transactionId} onChange={e => setTransactionId(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: 2668224881 / 118276349..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Comprovativo (screenshot) *</label>
                  <label className="flex items-center justify-center gap-2 w-full bg-secondary border border-dashed border-border rounded-lg px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-secondary/60">
                    <Upload className="h-4 w-4" />
                    {proofFile ? proofFile.name : "Anexar imagem do pagamento"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => setProofFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {submitError && <p className="mt-4 text-sm text-destructive">{submitError}</p>}

              <button onClick={handleManualSubmit} disabled={submitting}
                className="mt-6 w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                {submitting ? "A enviar comprovativo..." : "Enviar comprovativo"}
              </button>

              <p className="mt-4 text-xs text-muted-foreground text-center">
                Após a confirmação (até 24h), o teu Premium é ativado automaticamente por 30 dias.
              </p>
            </motion.div>
          )}

          {/* Histórico de pagamentos */}
          {payments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mt-10 max-w-4xl mx-auto">
              <h2 className="font-display text-xl font-bold mb-4">Os teus pagamentos</h2>
              <div className="glass-card overflow-hidden">
                <div className="space-y-3 p-5">
                  {payments.map(p => {
                    const badge = STATUS_LABEL[p.status] || STATUS_LABEL.pending;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/50 border border-border/40">
                        <div>
                          <p className="font-semibold text-sm">
                            {METHOD_LABEL[p.method]} · {p.currency === "usd" ? `$${p.amount}` : `${p.amount} Kz`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            TX: {p.transaction_id} · {new Date(p.created_at).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-lg border font-medium shrink-0 ${badge.className}`}>
                          {badge.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Alertas premium */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-16 text-center">
            <h2 className="font-display text-2xl font-bold mb-8">Alertas Premium</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { icon: "💬", title: "WhatsApp", desc: "Notificações instantâneas" },
                { icon: "✈️", title: "Telegram", desc: "Bot dedicado" },
                { icon: "📧", title: "Email", desc: "Resumo diário" },
              ].map((item, i) => (
                <div key={i} className="glass-card p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
