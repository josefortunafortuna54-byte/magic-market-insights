import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  TrendingUp, Brain, Shield, Crown, ChevronRight, Zap, Target, Activity,
  RefreshCw, Bot, Trophy, Lock, ArrowRight, BarChart3, Sparkles, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { PremiumSignalCard } from "@/components/signals/PremiumSignalCard";
import { PerformanceStats } from "@/components/dashboard/PerformanceStats";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { MarketTicker } from "@/components/market/MarketTicker";
import { useSignals } from "@/hooks/useSignals";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { data: signals, isLoading: signalsLoading } = useSignals("active");
  const { data: prices, isLoading: pricesLoading, refetch: refetchPrices } = useMarketPrices();
  const { user, profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const featuredSignals = signals?.slice(0, 3) || [];

  const refreshMarketData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-market-prices");
      if (error) throw error;
      await refetchPrices();
      toast({ title: "Preços atualizados", description: "Dados de mercado atualizados." });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 trading-grid" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        
        <motion.div
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/5 w-72 h-72 bg-primary/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 left-1/6 w-96 h-96 bg-accent/5 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">Mercado ao Vivo</span>
              <span className="text-xs text-muted-foreground">• Sinais em tempo real</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              Sinais inteligentes.{" "}
              <span className="gradient-text">Lucro real.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
            >
              IA analisa o mercado 24/7 e gera sinais de trading com alta precisão. 
              Entrada, Stop Loss e Take Profit definidos automaticamente.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-primary font-medium mb-8"
            >
              Usuários Premium ganham em média +37% ao mês
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/registro">
                <Button size="xl" className="font-bold text-base gap-2">
                  Começar Grátis
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/resultados">
                <Button variant="outline" size="xl" className="gap-2">
                  <Trophy className="h-5 w-5" />
                  Ver Resultados
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-bold">
                      {["A","B","C","D"][i-1]}
                    </div>
                  ))}
                </div>
                <span>+2.4k traders ativos</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className="text-warning text-sm">★</span>
                ))}
                <span className="ml-1">4.9/5</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Performance Stats */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <PerformanceStats />
        </div>
      </section>

      {/* Equity Curve + Live Market */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <EquityCurve />
            <div className="space-y-6">
              <MarketTicker />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Signals */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Sinais em Destaque</h2>
                <Badge variant="default" className="gap-1">
                  <Zap className="h-3 w-3" /> LIVE
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Gerados por IA com análise técnica avançada</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshMarketData} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Link to="/analises">
                <Button variant="outline" size="sm">
                  Ver Todos <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {signalsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : featuredSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Bot className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">IA a analisar o mercado...</h3>
              <p className="text-sm text-muted-foreground">Novos sinais serão gerados em breve.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSignals.map((signal, i) => (
                <PremiumSignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-card/30" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-4">
              <Brain className="h-3 w-3 mr-1" /> Tecnologia
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Porquê <span className="gradient-text">Magic Trader</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Combinamos IA avançada com análise técnica profissional para entregar sinais de alta precisão.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Bot, title: "IA Trader", desc: "Algoritmos analisam padrões 24/7 e geram sinais automáticos." },
              { icon: Shield, title: "Gestão de Risco", desc: "SL e TP automáticos com risco/retorno mínimo de 1:2." },
              { icon: Zap, title: "Tempo Real", desc: "Sinais instantâneos com alertas push e notificações." },
              { icon: Trophy, title: "Track Record", desc: "Resultados transparentes com histórico completo verificável." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 hover:border-primary/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center mx-auto mb-6">
              <Crown className="h-8 w-8 text-warning-foreground" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Desbloquear sinais profissionais
            </h2>
            <p className="text-lg text-muted-foreground mb-3">
              Ganhe como trader institucional com acesso total à plataforma.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm">
              {["Sinais em tempo real", "IA avançada", "Histórico completo", "Alertas VIP"].map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/planos">
                <Button variant="premium" size="xl" className="gap-2">
                  <Crown className="h-5 w-5" />
                  Assinar Premium
                </Button>
              </Link>
              <Link to="/resultados">
                <Button variant="outline" size="lg" className="gap-2">
                  Ver Resultados Reais
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold mb-4">Como Funciona</h2>
            <p className="text-muted-foreground">3 passos para começar</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", icon: Zap, title: "Crie sua Conta", desc: "Registe-se gratuitamente em segundos." },
              { step: "02", icon: Bot, title: "IA Analisa", desc: "Nossa IA analisa o mercado e gera sinais." },
              { step: "03", icon: Target, title: "Execute", desc: "Receba sinais com entrada, SL e TP definidos." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center relative"
              >
                <div className="text-5xl font-display font-bold text-primary/10 absolute -top-2 left-1/2 -translate-x-1/2">{item.step}</div>
                <div className="relative pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
