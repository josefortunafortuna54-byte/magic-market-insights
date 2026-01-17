import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, BarChart3, History, Lock, RefreshCw, TrendingUp } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { LivePriceBar } from "@/components/trading/LivePriceBar";
import { LivePriceCard } from "@/components/trading/LivePriceCard";
import { AnalysisCard } from "@/components/trading/AnalysisCard";
import { PairSelector } from "@/components/trading/PairSelector";
import { TimeframeSelector } from "@/components/trading/TimeframeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useMarketPrices, useMarketAnalysis, refreshMarketData, refreshMarketAnalysis } from "@/hooks/useMarketData";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isPremium, loading } = useAuth();
  const { data: pairs = [] } = useTradingPairs();
  const { data: prices = [], isLoading: pricesLoading } = useMarketPrices();
  const { data: analyses = [], isLoading: analysesLoading } = useMarketAnalysis();
  
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("60");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current analysis for selected pair
  const currentAnalysis = analyses.find(a => a.symbol === selectedPair && a.timeframe === "H1");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshMarketData(),
        refreshMarketAnalysis("H1")
      ]);
      toast.success("Dados atualizados com sucesso!");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  // Filter pairs based on plan
  const accessiblePairs = pairs.filter(p => !p.is_premium || isPremium);

  // Filter analyses for accessible pairs
  const accessibleAnalyses = analyses.filter(a => {
    const pair = pairs.find(p => p.symbol === a.symbol);
    return pair ? (!pair.is_premium || isPremium) : true;
  });

  const canAccessPair = (symbol: string) => {
    const pair = pairs.find(p => p.symbol === symbol);
    return pair ? (!pair.is_premium || isPremium) : true;
  };

  return (
    <Layout>
      {/* Live Price Bar */}
      <LivePriceBar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Olá, {profile?.full_name || "Trader"} 👋
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isPremium ? "default" : "secondary"}>
                {isPremium ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </>
                ) : (
                  "Free"
                )}
              </Badge>
              {!isPremium && (
                <Link to="/planos">
                  <Button variant="premium" size="sm">
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Atualizando..." : "Atualizar Dados"}
          </Button>
        </motion.div>

        {/* Live Prices Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
        >
          {accessiblePairs.slice(0, 6).map((pair) => {
            const price = prices.find(p => p.symbol === pair.symbol);
            return (
              <LivePriceCard
                key={pair.id}
                symbol={pair.symbol}
                price={price}
                isLoading={pricesLoading}
              />
            );
          })}
        </motion.div>

        {/* Chart Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <PairSelector
              pairs={pairs}
              selectedPair={selectedPair}
              onSelect={(symbol) => {
                if (canAccessPair(symbol)) {
                  setSelectedPair(symbol);
                }
              }}
            />
            <TimeframeSelector
              selected={selectedTimeframe}
              onSelect={setSelectedTimeframe}
            />
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            {canAccessPair(selectedPair) ? (
              <TradingViewChart
                symbol={selectedPair}
                interval={selectedTimeframe}
                className="min-h-[400px] md:min-h-[500px]"
              />
            ) : (
              <div className="glass-card min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center">
                <Lock className="h-16 w-16 text-warning mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">Conteúdo Premium</h3>
                <p className="text-muted-foreground mb-4">
                  Atualize para Premium para acessar {selectedPair}
                </p>
                <Link to="/planos">
                  <Button variant="premium">
                    <Crown className="h-4 w-4 mr-2" />
                    Tornar-se Premium
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Current Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-display font-bold text-lg mb-4">Análise Atual</h3>
            {currentAnalysis ? (
              <AnalysisCard analysis={currentAnalysis} />
            ) : (
              <div className="glass-card p-6 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Análise para {selectedPair} será gerada automaticamente
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* All Analyses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Tabs defaultValue="analyses" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="analyses" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Análises ({accessibleAnalyses.filter(a => a.signal_type !== "WAIT").length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="analyses" className="mt-6">
              {accessibleAnalyses.filter(a => a.signal_type !== "WAIT").length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold mb-2">
                    Nenhuma análise ativa
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    As análises serão geradas automaticamente a cada 15 minutos.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accessibleAnalyses
                    .filter(a => a.signal_type !== "WAIT")
                    .slice(0, 9)
                    .map((analysis, i) => (
                      <AnalysisCard
                        key={analysis.id}
                        analysis={analysis}
                        index={i}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <div className="glass-card p-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">
                  Histórico em breve
                </h3>
                <p className="text-sm text-muted-foreground">
                  O histórico de análises será implementado em breve.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}
