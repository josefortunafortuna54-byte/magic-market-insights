import { motion } from "framer-motion";
import { Check, X, Crown, Zap, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const PRICE_USD = "price_1TFxrTFhhUIUNgIiq63DRgfR";
const PRICE_AOA = "price_1TFy43FhhUIUNgIipGNzaA8J";

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

export default function Planos() {
  const { user, isPremium, loading, checkout } = useSubscription();
  const [searchParams] = useSearchParams();
  const [currency, setCurrency] = useState<"usd" | "aoa">("usd");
  const [checkingOut, setCheckingOut] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const handleCheckout = async () => {
    setCheckingOut(true);
    const priceId = currency === "usd" ? PRICE_USD : PRICE_AOA;
    await checkout(priceId, currency);
    setCheckingOut(false);
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
                {currency === "usd" ? (
                  <>
                    <span className="font-display text-4xl font-bold gradient-text">$29.99</span>
                    <span className="text-muted-foreground">/mês</span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-4xl font-bold gradient-text">20.000 Kz</span>
                    <span className="text-muted-foreground">/mês</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 relative">
                {premiumFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              {isPremium ? (
                <div className="w-full py-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm font-medium text-center">
                  ✓ Plano Ativo
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-primary)" }}
                >
                  {checkingOut ? "A redirecionar..." : user ? "Assinar Premium" : "Criar Conta e Assinar"}
                </button>
              )}
            </motion.div>
          </div>

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
