import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, Search, Lock, Crown, TrendingUp, TrendingDown, Clock, RefreshCw, Activity } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { LivePriceBar } from "@/components/trading/LivePriceBar";
import { AnalysisCard } from "@/components/trading/AnalysisCard";
import { PairSelector } from "@/components/trading/PairSelector";
import { TimeframeSelector } from "@/components/trading/TimeframeSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useMarketAnalysis, refreshMarketData, refreshMarketAnalysis } from "@/hooks/useMarketData";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const signalTypes = ["Todos", "BUY", "SELL"];
const timeframeMapping: Record<string, string> = {
  "5": "M5",
  "15": "M15",
  "60": "H1",
  "240": "H4",
  "D": "D1",
};

export default function Analises() {
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const { data: pairs = [], isLoading: pairsLoading } = useTradingPairs();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState("60");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get timeframe for analysis query
  const analysisTimeframe = timeframeMapping[selectedTimeframe] || "H1";
  const { data: analyses = [], isLoading: analysesLoading } = useMarketAnalysis(analysisTimeframe);

  // Get available pairs based on plan
  const availablePairs = pairs.filter(pair => !pair.is_premium || isPremium);
  const premiumPairs = pairs.filter(pair => pair.is_premium && !isPremium);

  // Set default pair when pairs load
  useEffect(() => {
    if (availablePairs.length > 0 && !selectedPair) {
      setSelectedPair(availablePairs[0].symbol);
    }
  }, [availablePairs, selectedPair]);

  // Filter analyses based on user's plan and filters
  const filteredAnalyses = analyses.filter((analysis) => {
    const pair = pairs.find(p => p.symbol.replace("/", "") === analysis.symbol);
    if (!pair) return false;
    
    // Check premium access
    if (pair.is_premium && !isPremium) return false;
    
    // Apply type filter
    if (selectedType !== "Todos" && analysis.signal_type !== selectedType) return false;
    
    return true;
  });

  // Convert symbol for TradingView (e.g., "EUR/USD" -> "EURUSD")
  const getTradingViewSymbol = (symbol: string) => {
    return symbol.replace("/", "");
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshMarketData(),
        refreshMarketAnalysis(analysisTimeframe),
      ]);
      toast({
        title: "Dados atualizados!",
        description: "Preços e análises foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      {/* Live Price Bar */}
      <LivePriceBar />

      {/* Header */}
      <section className="pt-8 pb-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                <span className="text-sm text-green-500 font-medium">ANÁLISES AUTOMÁTICAS</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                Análises em Tempo Real
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Análises técnicas automatizadas baseadas em RSI, EMAs e tendência. 
                Atualizadas continuamente pelo sistema.
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar Dados
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="glass-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <PairSelector
                  pairs={pairs}
                  selectedPair={selectedPair}
                  onSelect={setSelectedPair}
                />
              </div>
              
              <TimeframeSelector
                selected={selectedTimeframe}
                onSelect={setSelectedTimeframe}
              />
            </div>

            {selectedPair && (
              <TradingViewChart
                symbol={getTradingViewSymbol(selectedPair)}
                interval={selectedTimeframe}
              />
            )}
          </div>

          {/* Premium Pairs Lock */}
          {premiumPairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 glass-card p-4 border-primary/30"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Pares Premium Bloqueados</p>
                    <p className="text-sm text-muted-foreground">
                      {premiumPairs.map(p => p.symbol).join(", ")} - Exclusivos para assinantes
                    </p>
                  </div>
                </div>
                <Link to="/planos">
                  <Button size="sm" className="gap-2">
                    <Crown className="h-4 w-4" />
                    Tornar-se Premium
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="pb-6">
        <div className="container mx-auto px-4">
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  <div className="flex gap-1">
                    {signalTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={selectedType === type ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedType(type)}
                      >
                        {type === "BUY" && <TrendingUp className="h-3 w-3 mr-1" />}
                        {type === "SELL" && <TrendingDown className="h-3 w-3 mr-1" />}
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {filteredAnalyses.length} análises disponíveis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {analysesLoading || pairsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                Nenhuma análise encontrada
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {analyses.length === 0 
                  ? "Clique em 'Atualizar Dados' para gerar análises automáticas."
                  : "Tente ajustar os filtros para ver mais análises."}
              </p>
              <Button onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Gerar Análises
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnalyses.map((analysis, i) => {
                const pair = pairs.find(p => p.symbol.replace("/", "") === analysis.symbol);
                return (
                  <AnalysisCard 
                    key={analysis.id} 
                    analysis={analysis} 
                    pairName={pair?.name}
                    index={i} 
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
