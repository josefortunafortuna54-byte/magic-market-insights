import { motion } from "framer-motion";
import { Check, X, Crown, Zap, Bell, MessageCircle, Mail, Sparkles, Bot, Shield, TrendingUp, Lock, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Gratuito",
    price: "€0",
    period: "/mês",
    description: "Comece a explorar sinais de trading",
    icon: Zap,
    popular: false,
    features: [
      { text: "3 pares (EUR/USD, GBP/USD, USD/JPY)", included: true },
      { text: "Sinais com delay de 5-10 min", included: true },
      { text: "Análise básica IA", included: true },
      { text: "3 sinais por dia", included: true },
      { text: "Sinais em tempo real", included: false },
      { text: "Histórico completo", included: false },
      { text: "IA Trader avançada", included: false },
      { text: "Alertas prioritários", included: false },
      { text: "Sinais VIP exclusivos", included: false },
      { text: "Dashboard premium", included: false },
    ],
    cta: "Começar Grátis",
    variant: "outline" as const,
  },
  {
    name: "Premium",
    price: "€49",
    period: "/mês",
    description: "Acesso total para traders sérios",
    icon: Crown,
    popular: true,
    features: [
      { text: "Todos os 13+ pares disponíveis", included: true },
      { text: "Sinais em tempo real", included: true },
      { text: "IA Trader avançada com chat", included: true },
      { text: "Sinais ilimitados", included: true },
      { text: "Alertas WhatsApp, Telegram, Email", included: true },
      { text: "Histórico completo verificável", included: true },
      { text: "Sinais VIP de alta confiança (85%+)", included: true },
      { text: "Dashboard premium completo", included: true },
      { text: "Gestão de risco avançada", included: true },
      { text: "Suporte prioritário 24/7", included: true },
    ],
    cta: "Assinar Premium",
    variant: "premium" as const,
  },
];

export default function Planos() {
  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="default" className="mb-4 gap-1">
              <Crown className="h-3 w-3" /> Premium
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Desbloqueie o poder <span className="gradient-text-gold">Premium</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Usuários Premium ganham em média +37% ao mês. 
              Comece grátis ou desbloqueie acesso total.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card-premium p-8 relative ${
                    plan.popular ? "border-warning/30 neon-border" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="warning" className="shadow-lg">
                        <Sparkles className="h-3 w-3 mr-1" /> Mais Popular
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      plan.popular ? "bg-warning/10" : "bg-secondary"
                    }`}>
                      <Icon className={`h-6 w-6 ${plan.popular ? "text-warning" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="font-display text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? "text-foreground/90" : "text-muted-foreground/40"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/registro">
                    <Button variant={plan.variant} size="lg" className="w-full gap-2">
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-display text-2xl font-bold mb-2">Alertas Premium</h2>
            <p className="text-sm text-muted-foreground">Receba sinais instantâneos onde preferir</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: MessageCircle, name: "WhatsApp", desc: "Notificações instantâneas" },
              { icon: Bell, name: "Telegram", desc: "Bot dedicado" },
              { icon: Mail, name: "Email", desc: "Resumo diário" },
            ].map((ch, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 text-center"
              >
                <ch.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-sm mb-1">{ch.name}</h3>
                <p className="text-xs text-muted-foreground">{ch.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold mb-2">Perguntas Frequentes</h2>
          </motion.div>
          <div className="max-w-2xl mx-auto space-y-3">
            {[
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Cancele quando quiser. Acesso mantido até o fim do período pago." },
              { q: "Os sinais garantem lucro?", a: "Não. Os sinais são educacionais. Trading envolve riscos e resultados passados não garantem lucros futuros." },
              { q: "Como funcionam os alertas?", a: "Alertas Premium são enviados em tempo real via WhatsApp, Telegram e Email em menos de 10 segundos." },
              { q: "Qual a taxa de acerto?", a: "Nossa média histórica é de ~82% de win rate, com gestão de risco de no mínimo 1:2 R:R." },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <h3 className="font-display font-bold text-sm mb-1">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
