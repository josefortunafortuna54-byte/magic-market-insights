import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingUp, Brain, Shield, Crown, ChevronRight, BarChart3, Zap, Target, Flame, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { useSignals } from "@/hooks/useSignals";
import { useBoomHours } from "@/hooks/useBoomHours";
import { useHistory } from "@/hooks/useHistory";

export default function Index() {
  const { t } = useTranslation();
  const { signals, loading } = useSignals();
  const { nextBoom, loading: boomLoading } = useBoomHours();
  const { stats } = useHistory();

  const features = [
    { icon: BarChart3, title: t("inicio.feature1Title"), description: t("inicio.feature1Desc") },
    { icon: Brain, title: t("inicio.feature2Title"), description: t("inicio.feature2Desc") },
    { icon: Shield, title: t("inicio.feature3Title"), description: t("inicio.feature3Desc") },
    { icon: Crown, title: t("inicio.feature4Title"), description: t("inicio.feature4Desc") },
  ];

  const featuredSignals = signals
    .filter(s => s.status === "active" && s.type !== "AGUARDAR")
    .slice(0, 3);

  const winRate = stats.total > 0 ? `${stats.winRate}%` : "—";
  const totalPairs = signals.length > 0 ? `${new Set(signals.map(s => s.pair)).size}+` : "—";

  const avgRR = useMemo(() => {
    const valid = signals.filter(s =>
      s.type !== "AGUARDAR" && s.entry > 0 && s.stopLoss > 0 && s.takeProfit > 0
    );
    if (valid.length === 0) return null;
    const ratios = valid.map(s => {
      const risk = Math.abs(s.entry - s.stopLoss);
      const reward = Math.abs(s.takeProfit - s.entry);
      return risk > 0 ? reward / risk : 0;
    }).filter(r => r > 0);
    if (ratios.length === 0) return null;
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return `1:${avg.toFixed(1)}`;
  }, [signals]);

  const displayStats = [
    { value: winRate, label: t("inicio.statWinRate") },
    { value: avgRR ?? "—", label: t("inicio.statAvgRR") },
    { value: "24/7", label: t("inicio.statMonitoring") },
    { value: totalPairs, label: t("inicio.statPairs") },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0" style={{
  backgroundImage: "url('/magic-bg.svg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  opacity: 0.6
}} />
<div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-sm font-medium">{t("inicio.heroBadge")}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex justify-center mb-8">
              <img 
                src="/logo.png" 
                alt="The Magic Trader" 
                className="h-24 w-24 object-contain logo-glow"
              />
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              {t("inicio.heroTitle1")}{" "}
              <span className="gradient-shield">{t("inicio.heroTitle2")}</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {t("inicio.heroSubtitle")}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/analises">
                <Button variant="hero" size="xl">
                  <TrendingUp className="h-5 w-5" />
                  {t("inicio.heroCtaLive")}
                </Button>
              </Link>
              <Link to="/planos">
                <Button variant="outline" size="xl">
                  {t("inicio.heroCtaPlans")}
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-border/50">
              {displayStats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Painel — NextBoom + Performance */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6 group hover:border-accent/40 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{t("components.nextBoomCard.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("inicio.nextBoomSubtitle")}</p>
                </div>
              </div>
              {boomLoading ? (
                <div className="h-5 bg-muted/40 rounded animate-pulse w-2/3" />
              ) : nextBoom ? (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xl font-display font-bold">{nextBoom.time_wat}</span>
                    <span className="badge-premium text-xs">{nextBoom.badge}</span>
                  </div>
                  <p className="font-semibold text-accent">{nextBoom.title}</p>
                  {nextBoom.pairs.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{nextBoom.pairs.join(" · ")}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{nextBoom.description}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("inicio.nextBoomNoSchedule")}</p>
              )}
            </div>

            <div className="glass-card p-6 group hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{t("components.performanceCard.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("inicio.perfSubtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className={`font-display text-3xl font-bold ${stats.total > 0 ? (stats.winRate >= 60 ? "text-success" : stats.winRate >= 40 ? "text-warning" : "text-muted-foreground") : "text-muted-foreground"}`}>
                  {stats.total > 0 ? `${stats.winRate}%` : "—"}
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{t("components.performanceCard.winRate")}</p>
                  <p>{t("inicio.perfSignalsAnalyzed", { count: stats.total })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.featuresTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("inicio.featuresSubtitle")}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 group hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sinais em Destaque — dados reais */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">{t("inicio.featuredTitle")}</h2>
              <p className="text-muted-foreground">{t("inicio.featuredSubtitle")}</p>
            </div>
            <Link to="/analises">
              <Button variant="outline">
                {t("inicio.viewAll")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 h-64 animate-pulse">
                  <div className="h-4 bg-muted/50 rounded mb-4 w-1/2" />
                  <div className="h-3 bg-muted/30 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : featuredSignals.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSignals.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals.slice(0, 3).map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.howTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("inicio.howSubtitle")}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", icon: Zap, title: t("inicio.howStep1Title"), description: t("inicio.howStep1Desc") },
              { step: "02", icon: BarChart3, title: t("inicio.howStep2Title"), description: t("inicio.howStep2Desc") },
              { step: "03", icon: Target, title: t("inicio.howStep3Title"), description: t("inicio.howStep3Desc") },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative text-center">
                <div className="text-6xl font-display font-bold text-primary/10 absolute -top-4 left-1/2 -translate-x-1/2">{item.step}</div>
                <div className="relative pt-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
            <Crown className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-8">{t("inicio.ctaSubtitle")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registro">
                <Button variant="hero" size="xl">
                  {t("inicio.ctaStart")}
                  <Sparkles className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/planos">
                <Button variant="outline" size="lg">{t("inicio.ctaPlansPremium")}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
