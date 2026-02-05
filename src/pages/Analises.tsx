import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, Search, Activity, Clock, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals } from "@/hooks/useSignals";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const timeframes = ["Todos", "M5", "M15", "H1", "H4", "D1"];
const signalTypes = ["Todos", "BUY", "SELL"];

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("Todos");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: pairs, isLoading: pairsLoading } = useTradingPairs();
  const { data: prices, isLoading: pricesLoading, refetch: refetchPrices } = useMarketPrices();

  const filteredSignals = (signals || []).filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter((s) => s.status === "active");
  const pairSymbols = pairs?.map((p) => p.symbol) || ["EUR/USD"];

  // Get price for selected pair
  const selectedPairPrice = prices?.find((p) => p.symbol === selectedPair);

  // Refresh market data
  const refreshMarketData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-market-prices");
      if (error) throw error;
      await refetchPrices();
      toast({
        title: "Preços atualizados",
        description: "Os dados de mercado foram atualizados.",
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

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl sm:text-4xl font-bold">
                  Análises em Tempo Real
                </h1>
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  LIVE
                </span>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Sinais educacionais baseados em análise técnica avançada e IA. 
                Cada sinal inclui pontos de entrada, stop loss e take profit.
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={refreshMarketData}
              disabled={isRefreshing}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Atualizando..." : "Atualizar Preços"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Live Prices Banner */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="glass-card-trading p-4 overflow-x-auto">
            <div className="flex gap-6 min-w-max">
              {pricesLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))
              ) : prices && prices.length > 0 ? (
                prices.map((price) => {
                  const isPositive = (price.change_percent ?? 0) >= 0;
                  return (
                    <button
                      key={price.id}
                      onClick={() => setSelectedPair(price.symbol)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        selectedPair === price.symbol 
                          ? "bg-primary/20 border border-primary/30" 
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-sm">{price.symbol}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {price.price < 100 ? price.price.toFixed(5) : price.price.toFixed(2)}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="text-xs font-medium">
                          {isPositive ? "+" : ""}{(price.change_percent ?? 0).toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum preço disponível</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-xl font-semibold">Gráfico: {selectedPair}</h2>
              {selectedPairPrice && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">
                    {selectedPairPrice.price < 100 
                      ? selectedPairPrice.price.toFixed(5) 
                      : selectedPairPrice.price.toFixed(2)}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${
                    (selectedPairPrice.change_percent ?? 0) >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {(selectedPairPrice.change_percent ?? 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {((selectedPairPrice.change_percent ?? 0) >= 0 ? "+" : "")}
                    {(selectedPairPrice.change_percent ?? 0).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            {selectedPairPrice && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Atualizado {formatDistanceToNow(new Date(selectedPairPrice.updated_at), { addSuffix: true, locale: ptBR })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {pairsLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-20" />
                ))}
              </div>
            ) : (
              pairSymbols.map((pair) => (
                <Button
                  key={pair}
                  variant={selectedPair === pair ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPair(pair)}
                >
                  {pair}
                </Button>
              ))
            )}
          </div>
          <TradingViewChart symbol={selectedPair} />
        </div>
      </section>

      {/* Filters */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {/* Timeframe Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Timeframe:</span>
                  <div className="flex gap-1">
                    {timeframes.map((tf) => (
                      <Badge
                        key={tf}
                        variant={selectedTimeframe === tf ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedTimeframe(tf)}
                      >
                        {tf}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
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
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                {activeSignals.length} sinais ativos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signals Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {signalsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : activeSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                Nenhum sinal encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                {filteredSignals.length === 0 && (signals?.length ?? 0) > 0
                  ? "Tente ajustar os filtros para ver mais sinais."
                  : "Novos sinais serão gerados em breve."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSignals.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
