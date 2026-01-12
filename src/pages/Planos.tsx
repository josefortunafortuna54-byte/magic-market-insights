import { motion } from "framer-motion";
import { Check, X, Crown, Zap, Bell, History, BarChart3, MessageCircle, Mail, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Gratuito",
    price: "€0",
    period: "/mês",
    description: "Ideal para começar a explorar análises Forex",
    icon: Zap,
    features: [
      { text: "1 par de moedas (EUR/USD)", included: true },
      { text: "Timeframe H1 apenas", included: true },
      { text: "Sinais básicos", included: true },
      { text: "Análise técnica simplificada", included: true },
      { text: "Alertas em tempo real", included: false },
      { text: "Histórico completo", included: false },
      { text: "Sinais de alta confiança", included: false },
      { text: "Suporte prioritário", included: false },
    ],
    cta: "Começar Grátis",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "€29",
    period: "/mês",
    description: "Acesso completo a todas as funcionalidades",
    icon: Crown,
    features: [
      { text: "Todos os pares de moedas (15+)", included: true },
      { text: "Timeframes M5, M15 e H1", included: true },
      { text: "Sinais ilimitados", included: true },
      { text: "Análise técnica completa", included: true },
      { text: "Alertas WhatsApp, Telegram e Email", included: true },
      { text: "Histórico completo", included: true },
      { text: "Sinais de alta confiança (85%+)", included: true },
      { text: "Suporte prioritário 24/7", included: true },
    ],
    cta: "Assinar Premium",
    variant: "premium" as const,
    popular: true,
  },
];

const alertChannels = [
  { icon: MessageCircle, name: "WhatsApp", description: "Notificações instantâneas" },
  { icon: Bell, name: "Telegram", description: "Bot dedicado" },
  { icon: Mail, name: "Email", description: "Resumo diário" },
];

export default function Planos() {
  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="default" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Planos
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Escolha o plano ideal para você
            </h1>
            <p className="text-lg text-muted-foreground">
              Comece gratuitamente ou desbloqueie todo o potencial com o Premium.
              Cancele a qualquer momento.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card p-8 relative ${
                    plan.popular ? "border-primary/50 ring-1 ring-primary/20" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="default" className="bg-primary shadow-lg shadow-primary/25">
                        Mais Popular
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      plan.popular ? "bg-primary/20" : "bg-secondary"
                    }`}>
                      <Icon className={`h-6 w-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="font-display text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/registro">
                    <Button variant={plan.variant} size="lg" className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Alert Channels */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Alertas Premium
            </h2>
            <p className="text-muted-foreground">
              Receba sinais instantâneos onde preferir
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {alertChannels.map((channel, i) => {
              const Icon = channel.icon;
              return (
                <motion.div
                  key={channel.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold mb-1">{channel.name}</h3>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Perguntas Frequentes
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-4">
            {[
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim! Você pode cancelar sua assinatura Premium a qualquer momento. Terá acesso até o final do período pago.",
              },
              {
                q: "Os sinais garantem lucro?",
                a: "Não. Os sinais são educacionais e baseados em análise técnica. Trading envolve riscos e resultados passados não garantem lucros futuros.",
              },
              {
                q: "Quais métodos de pagamento são aceitos?",
                a: "Aceitamos cartões de crédito/débito, PayPal e criptomoedas.",
              },
              {
                q: "Quanto tempo leva para receber os alertas?",
                a: "Os alertas Premium são enviados em tempo real, geralmente em menos de 10 segundos após a geração do sinal.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <h3 className="font-display font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
