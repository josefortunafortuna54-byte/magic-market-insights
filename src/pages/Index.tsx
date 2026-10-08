import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingUp, Brain, Shield, Crown, ChevronRight, BarChart3, Zap, Target, Flame, Activity, Calendar, Users, Download, Play, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { HeroSignalTerminal } from "@/components/home/HeroSignalTerminal";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useSignals } from "@/hooks/useSignals";
import { useBoomHours } from "@/hooks/useBoomHours";
import { useBoomCountdown, formatCountdown } from "@/hooks/useBoomCountdown";
import { useHistory } from "@/hooks/useHistory";

export default function Index() {
  const { t } = useTranslation();
  const { signals, loading } = useSignals();
  const { nextBoom, booms, loading: boomLoading } = useBoomHours();
  const { stats } = useHistory();
  const { user } = useAuth();
  const countdown = useBoomCountdown(booms);

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
    { Icon: Target, label: t("inicio.statWinRate"), value: winRate },
    { Icon: BarChart3, label: t("inicio.statAvgRR"), value: avgRR ?? "—" },
    { Icon: Calendar, label: t("inicio.statMonitoring"), value: "24/7" },
    { Icon: Users, label: t("inicio.statPairs"), value: totalPairs },
  ];

  const reduceMotion = useReducedMotion();

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_78%_-15%,rgba(34,197,94,0.10),transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_78%_-15%,rgba(34,197,94,0.07),transparent_60%)]"
        />

        <div className="container mx-auto px-4 pt-4 pb-20 lg:flex lg:pt-6 lg:pb-24">
          <div className="w-full grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4 }}
                id="tour-hero"
                className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2"
              >
                <span className="h-2 w-2 rounded-full bg-success ring-4 ring-success/15" />
                <span className="text-sm font-medium">{t("inicio.heroBadge")}</span>
              </motion.div>

              <motion.h1
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.06 }}
                className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
              >
                {t("inicio.heroTitle1")}{" "}
                <span className="text-primary">{t("inicio.heroTitle2")}</span>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.12 }}
                className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
              >
                {t("inicio.heroSubtitle")}
              </motion.p>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.18 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <Button variant="default" size="xl" className="w-full sm:w-auto" asChild>
                  <Link to="/analises">
                    <TrendingUp />
                    {t("inicio.heroCtaLive")}
                  </Link>
                </Button>
                <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
                  <Link to="/planos">
                    {t("inicio.heroCtaPlans")}
                    <ChevronRight />
                  </Link>
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 }}
              className="lg:col-span-5"
            >
              <HeroSignalTerminal />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Banda de stats (lod.png) */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border/40">
            {displayStats.map((stat, i) => (
              <div
                key={stat.label}
                className={cn("flex items-start gap-3 sm:px-6", i === 0 && "sm:pl-0")}
              >
                <stat.Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
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
                  {countdown && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      <Flame className="h-3.5 w-3.5" />
                      {t("inicio.nextBoomCountdown")}{" "}
                      <span className="tabular-nums">{formatCountdown(countdown.ms)}</span>
                    </p>
                  )}
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
      <section className="py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <h2 id="tour-features" className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.featuresTitle")}</h2>
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
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h2 id="tour-featured" className="font-display text-3xl sm:text-4xl font-bold mb-2">{t("inicio.featuredTitle")}</h2>
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
      <section className="py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <h2 id="tour-how" className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.howTitle")}</h2>
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

      {/* App — publicidade download */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/[0.07] via-card/40 to-accent/[0.07] py-12 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="tour-app" className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("app.title")}</h2>
              <p className="text-muted-foreground max-w-xl mb-6">{t("app.subtitle")}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-5">{t("app.tagline")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.magictrader.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-b from-[#0facf2] to-[#0e7dd6]">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </span>
                  <span className="flex flex-col text-left leading-tight">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("app.availableOn")}</span>
                    <span className="font-display text-base font-bold">{t("app.playStore")}</span>
                  </span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.magictrader.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/60 px-5 py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  {t("app.direct")}
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-[250px]">
              <div aria-hidden="true" className="absolute inset-0 -z-10 translate-y-6 scale-110 rounded-[2.5rem] bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl" />
              <div className="rounded-[2.2rem] border border-border/70 bg-card p-2.5 shadow-2xl">
                <div className="overflow-hidden rounded-[1.7rem] bg-secondary/50">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-destructive/70" />
                      <span className="h-2 w-2 rounded-full bg-warning/70" />
                      <span className="h-2 w-2 rounded-full bg-success/70" />
                    </div>
                    <span className="font-display text-[10px] font-bold tracking-[0.2em] text-muted-foreground">TMT</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-blink" />
                      AO VIVO
                    </span>
                  </div>
                  <div className="space-y-2 px-3 pb-4">
                    {[
                      { pair: "EUR/USD", price: "1.08432", change: 0.12 },
                      { pair: "XAU/USD", price: "2415.60", change: -0.31 },
                      { pair: "BTC/USD", price: "63920", change: 1.04 },
                    ].map((row) => (
                      <div key={row.pair} className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3 py-2.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">{row.pair}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tabular-nums">{row.price}</span>
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${row.change > 0 ? "text-success" : "text-destructive"}`}>
                            {row.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {row.change > 0 ? "+" : ""}{row.change.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center">
                      <span className="font-display text-[11px] font-bold text-primary">SINAIS EM DIRETO</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
            <Crown className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 id="tour-cta" className="font-display text-3xl sm:text-4xl font-bold mb-4">{t("inicio.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-8">{t("inicio.ctaSubtitle")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!user && (
                <Link to="/registro">
                  <Button variant="hero" size="xl">
                    {t("inicio.ctaStart")}
                    <Sparkles className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              )}
              <Link to="/planos">
                <Button variant={user ? "hero" : "outline"} size="lg">{t("inicio.ctaPlansPremium")}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <GuidedTour />
    </Layout>
  );
}
