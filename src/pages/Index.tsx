import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  TrendingUp, 
  Brain, 
  Shield, 
  Crown, 
  ChevronRight,
  BarChart3,
  Zap,
  Target,
  Activity,
  Clock,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { MarketTicker } from "@/components/market/MarketTicker";
import { MarketOverview } from "@/components/market/MarketOverview";
import { useSignals } from "@/hooks/useSignals";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const features = [
  {
    icon: BarChart3,
    title: "Análise Técnica Avançada",
    description: "RSI, EMAs, suportes e resistências combinados para identificar as melhores oportunidades.",
  },
  {
    icon: Brain,
    title: "Inteligência Artificial",
    description: "Algoritmos de IA analisam padrões e tendências para aumentar a precisão dos sinais.",
  },
  {
    icon: Shield,
    title: "Gestão de Risco",
    description: "Cada sinal inclui Stop Loss e Take Profit com RR mínimo de 1:2.",
  },
  {
    icon: Crown,
    title: "Plano Premium",
    description: "Acesso a todos os pares, timeframes e alertas em tempo real.",
  },
];

export default function Index() {
  const { data: signals, isLoading: signalsLoading } = useSignals("active");
  const { data: prices, isLoading: pricesLoading, refetch: refetchPrices } = useMarketPrices();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const featuredSignals = signals?.slice(0, 3) || [];

  // Calculate live stats from real data
  const gainers = prices?.filter((p) => (p.change_percent ?? 0) > 0).length ?? 0;
  const losers = prices?.filter((p) => (p.change_percent ?? 0) < 0).length ?? 0;
  const totalPairs = prices?.length ?? 0;
  const activeSignals = signals?.length ?? 0;

  const stats = [
    { value: activeSignals.toString(), label: "Sinais Ativos", icon: Zap, color: "text-primary" },
    { value: totalPairs.toString(), label: "Pares Monitorados", icon: Activity, color: "text-warning" },
    { value: gainers.toString(), label: "Em Alta", icon: TrendingUp, color: "text-success" },
    { value: losers.toString(), label: "Em Baixa", icon: Target, color: "text-destructive" },
  ];

  // Function to fetch fresh market prices
  const refreshMarketData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-market-prices");
      if (error) throw error;
      await refetchPrices();
      setLastUpdate(new Date());
      toast({
        title: "Preços atualizados",
        description: "Os dados de mercado foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error("Error refreshing prices:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os preços.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update last update time from prices data
  useEffect(() => {
    if (prices && prices.length > 0) {
      const latestUpdate = prices.reduce((latest, p) => {
        const pDate = new Date(p.updated_at);
        return pDate > latest ? pDate : latest;
      }, new Date(0));
      setLastUpdate(latestUpdate);
    }
  }, [prices]);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden trading-grid">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        
        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Live Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-sm font-medium text-success">Mercado ao Vivo</span>
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  • Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Análise inteligente.{" "}
              <span className="gradient-text">Dados em tempo real.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Monitore o mercado Forex em tempo real com preços atualizados, 
              sinais de IA e análises técnicas avançadas.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/analises">
                <Button variant="hero" size="xl">
                  <TrendingUp className="h-5 w-5" />
                  Ver Análises
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="xl"
                onClick={refreshMarketData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Atualizando..." : "Atualizar Preços"}
              </Button>
            </motion.div>

            {/* Live Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-8 border-t border-border/50"
            >
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="glass-card-trading p-4 text-center">
                    <Icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                    {pricesLoading || signalsLoading ? (
                      <Skeleton className="h-8 w-16 mx-auto mb-1" />
                    ) : (
                      <p className={`font-display text-2xl sm:text-3xl font-bold ${stat.color}`}>
                        {stat.value}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Market Section */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <MarketTicker />
          </motion.div>
        </div>
      </section>

      {/* Market Overview */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <MarketOverview />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Por que escolher The Magic Trader?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combinamos análise técnica avançada com inteligência artificial 
              para fornecer sinais educacionais de alta qualidade.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 group hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Signals */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12"
          >
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                Sinais em Destaque
              </h2>
              <p className="text-muted-foreground">
                Análises mais recentes com alta confiança
              </p>
            </div>
            <Link to="/analises">
              <Button variant="outline">
                Ver Todos
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          {signalsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : featuredSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                Nenhum sinal ativo no momento
              </h3>
              <p className="text-sm text-muted-foreground">
                Novos sinais serão gerados em breve.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSignals.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Como Funciona
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Três passos simples para começar a receber análises
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                icon: Zap,
                title: "Crie sua Conta",
                description: "Registe-se gratuitamente e tenha acesso a sinais básicos.",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "Receba Análises",
                description: "Acompanhe os sinais com entradas, SL e TP definidos.",
              },
              {
                step: "03",
                icon: Target,
                title: "Estude o Mercado",
                description: "Use as análises para aprender e desenvolver sua estratégia.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="text-6xl font-display font-bold text-primary/10 absolute -top-4 left-1/2 -translate-x-1/2">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <Crown className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Pronto para elevar sua análise?
            </h2>
            <p className="text-muted-foreground mb-8">
              Junte-se aos traders que utilizam o The Magic Trader para 
              análises técnicas de alta qualidade.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registro">
                <Button variant="hero" size="xl">
                  Começar Agora
                  <Sparkles className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/planos">
                <Button variant="outline" size="lg">
                  Ver Planos Premium
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
