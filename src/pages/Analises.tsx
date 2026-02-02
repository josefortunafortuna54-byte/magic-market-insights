import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, Search, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals } from "@/hooks/useSignals";
import { useTradingPairs } from "@/hooks/useTradingPairs";

const timeframes = ["Todos", "M5", "M15", "H1", "H4", "D1"];
const signalTypes = ["Todos", "BUY", "SELL"];

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("Todos");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");

  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: pairs, isLoading: pairsLoading } = useTradingPairs();

  const filteredSignals = (signals || []).filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter((s) => s.status === "active");
  const pairSymbols = pairs?.map((p) => p.symbol) || ["EUR/USD"];

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Análises em Tempo Real
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Sinais educacionais baseados em análise técnica avançada e IA. 
              Cada sinal inclui pontos de entrada, stop loss e take profit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold mb-4">Gráfico</h2>
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

              <div className="ml-auto text-sm text-muted-foreground">
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
