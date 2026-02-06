import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, Search, Activity, Clock, RefreshCw, TrendingUp, TrendingDown, Bot, Zap } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PremiumSignalCard } from "@/components/signals/PremiumSignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals, useGenerateSignal } from "@/hooks/useSignals";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAdmin } = useAuth();
  const generateSignal = useGenerateSignal();

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
  const selectedPairPrice = prices?.find((p) => p.symbol === selectedPair);

  const refreshMarketData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-market-prices");
      if (error) throw error;
      await refetchPrices();
      toast({ title: "Preços atualizados" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Painel de Sinais</h1>
                <Badge variant="default" className="gap-1 text-[10px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                  </span>
                  LIVE
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sinais gerados por IA com análise técnica avançada
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="default" size="sm" onClick={() => generateSignal.mutate(undefined)} disabled={generateSignal.isPending}>
                  <Bot className="h-4 w-4 mr-1" />
                  {generateSignal.isPending ? "Gerando..." : "Gerar Sinal IA"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refreshMarketData} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Chart */}
      <section className="pb-6">
        <div className="container mx-auto px-4">
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-lg font-semibold">{selectedPair}</h2>
              {selectedPairPrice && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">
                    {selectedPairPrice.price < 100 ? selectedPairPrice.price.toFixed(5) : selectedPairPrice.price.toFixed(2)}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${(selectedPairPrice.change_percent ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {(selectedPairPrice.change_percent ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {((selectedPairPrice.change_percent ?? 0) >= 0 ? "+" : "")}{(selectedPairPrice.change_percent ?? 0).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            {selectedPairPrice && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(selectedPairPrice.updated_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pairsLoading ? (
              <div className="flex gap-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-20" />)}</div>
            ) : (
              pairSymbols.map((pair) => (
                <Button key={pair} variant={selectedPair === pair ? "default" : "outline"} size="sm" className="text-xs h-8"
                  onClick={() => setSelectedPair(pair)}>
                  {pair}
                </Button>
              ))
            )}
          </div>
          <TradingViewChart symbol={selectedPair} />
        </div>
      </section>

      {/* Filters */}
      <section className="pb-6">
        <div className="container mx-auto px-4">
          <div className="glass-card p-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Filtros:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">TF:</span>
                  {timeframes.map((tf) => (
                    <Badge key={tf} variant={selectedTimeframe === tf ? "default" : "outline"}
                      className="cursor-pointer text-[10px]" onClick={() => setSelectedTimeframe(tf)}>
                      {tf}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Tipo:</span>
                  {signalTypes.map((type) => (
                    <Badge key={type} variant={selectedType === type ? "default" : "outline"}
                      className="cursor-pointer text-[10px]" onClick={() => setSelectedType(type)}>
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                {activeSignals.length} ativos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signals */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {signalsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : activeSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Bot className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Nenhum sinal encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {filteredSignals.length === 0 && (signals?.length ?? 0) > 0
                  ? "Ajuste os filtros para ver mais sinais."
                  : "Novos sinais serão gerados em breve."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeSignals.map((signal, i) => (
                <PremiumSignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
