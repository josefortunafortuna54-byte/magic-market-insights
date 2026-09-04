import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Rocket, Trophy, Crown, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS, PRICES, planLabel, type Currency, type PlanId } from "@/lib/plans";
import { PLAN_LIMITS } from "@/lib/gating";

const PLAN_ICONS: Record<PlanId, ComponentType<{ className?: string }>> = {
  free: Zap,
  basic: Zap,
  pro: Rocket,
  premium: Trophy,
};

/** Derives the PT feature lines for a plan from its real gating limits. */
function buildFeatures(planId: PlanId): string[] {
  const limits = PLAN_LIMITS[planId];
  const features: string[] = [
    `${limits.pairs.length} pares (${limits.pairs.join(", ")})`,
    `${limits.timeframes.length} timeframes (${limits.timeframes.join(", ")})`,
    limits.pushAlertsPerDay === -1
      ? "Alertas push ilimitados/dia"
      : `${limits.pushAlertsPerDay} alertas push/dia`,
  ];
  if (limits.hasAnalysis) {
    features.push("Análises técnicas");
  }
  return features;
}

const TRUST = ["Pagamento seguro", "Cancela quando quiseres", "Suporte dedicado"];

export default function Planos() {
  const { tier, currency: defaultCurrency } = useSubscription();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  return (
    <Layout>
      <section className="pt-12 pb-6">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 text-sm">
              <Star className="h-4 w-4 text-primary" />
              Planos
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Escolhe o teu plano
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Começa grátis ou desbloqueia análises completas com um plano pago.
            </p>
          </motion.div>

          {/* Seletor de moeda */}
          <div className="flex justify-center mb-10">
            <Tabs value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <TabsList>
                <TabsTrigger value="usd">USD ($)</TabsTrigger>
                <TabsTrigger value="aoa">AOA (Kz)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Cards de planos */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
            {/* Gratuito */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-8 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Gratuito</h2>
                  <p className="text-xs text-muted-foreground">Para experimentar</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold">{PRICES[currency].free}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {buildFeatures("free").map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {tier === "free" ? (
                  <span className="w-full py-3 rounded-xl border border-border/60 text-muted-foreground text-sm font-medium text-center block">
                    Plano atual
                  </span>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Escolher
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Pagos */}
            {PLANS.map((plan, i) => {
              const planId = plan.id;
              const isCurrent = tier === planId;
              const isPro = plan.highlight === true;
              const isPremiumCard = plan.featured === true;
              const planIcon = PLAN_ICONS[planId];
              const Icon = planIcon;
              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`glass-card p-8 flex flex-col relative overflow-hidden ${
                    isPro ? "border-primary ring-2 ring-primary/30" : ""
                  }`}
                >
                  <div className="absolute top-4 right-4">
                    <span className={isPremiumCard ? "badge-premium" : "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"}>
                      <Crown className="h-3 w-3" />
                      {isPremiumCard ? "TOP" : "MAIS POPULAR"}
                    </span>
                  </div>
                  {isPro && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  )}

                  <div className="flex items-center gap-3 mb-6 relative">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${isPremiumCard ? "text-accent" : "text-primary"}`} />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold">{planLabel(planId)}</h2>
                      <p className="text-xs text-muted-foreground">
                        {planId === "basic" ? "Primeiro passo profissional" : planId === "pro" ? "A arma secreta do trader" : "Experiência institucional"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 relative">
                    <span className={`font-display text-4xl font-bold ${isPremiumCard ? "gradient-text-gold" : ""}`}>
                      {PRICES[currency][planId]}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1 relative">
                    {buildFeatures(planId).map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto relative">
                    {isCurrent ? (
                      <span className="badge-premium w-full justify-center py-3 flex">
                        <Check className="h-4 w-4" />
                        Plano atual
                      </span>
                    ) : (
                      <Link to={`/depositos?plan=${planId}&currency=${currency}`} className="block w-full">
                        <Button
                          variant={isPremiumCard ? "premium" : "default"}
                          className="w-full"
                        >
                          Subscrever
                        </Button>
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Confiança */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-14 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {TRUST.map((item) => (
              <div key={item} className="glass-card p-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">{item}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
