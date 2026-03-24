import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, Search, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { Badge } from "@/components/ui/badge";
import { mockSignals } from "@/data/mockSignals";

const timeframes = ["Todos", "M5", "M15", "H1", "H4", "D1"];
const signalTypes = ["Todos", "BUY", "SELL", "AGUARDAR"];

const pairPrices: Record<string, { price: string; change: number }> = {
  "EUR/USD": { price: "1.15550", change: 0.02 },
  "GBP/USD": { price: "1.27100", change: -0.08 },
  "USD/JPY": { price: "148.500", change: 0.12 },
  "AUD/USD": { price: "0.63420", change: -0.03 },
  "EUR/GBP": { price: "0.85890", change: 0.01 },
  "USD/CHF": { price: "0.89750", change: -0.05 },
};

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("Todos");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [currentPrice, setCurrentPrice] = useState(pairPrices["EUR/USD"]);

  useEffect(() => {
    setCurrentPrice(pairPrices[selectedPair] ?? { price: "—", change: 0 });
  }, [selectedPair]);

  const filteredSignals = mockSignals.filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter((s) => s.status === "active" || !s.status);
  const pairs = [...new Set(mockSignals.map((s) => s.pair))];

  const isUp = currentPrice.change > 0;
  const isFlat = currentPrice.change === 0;

  return (
    <Layout>
      {/* Header compacto */}
      <section className="pt-20 pb-4">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-xs text-success font-medium uppercase tracking-wider">Ao Vivo</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                Painel de Sinais
              </h1>
            </div>

            {/* Preço atual do par selecionado */}
            <motion.div
              key={selectedPair}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 glass-card px-4 py-3"
            >
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{selectedPair}</p>
                <p className="font-display text-2xl font-bold font-trading">
                  {currentPrice.price}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${
                isFlat
                  ? "bg-muted/50 text-muted-foreground"
                  : isUp
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {isFlat ? (
                  <Minus className="h-3.5 w-3.5" />
                ) : isUp ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isUp ? "+" : ""}{currentPrice.change.toFixed(2)}%
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Seletor de pares melhorado */}
      <section className="pb-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            {pairs.map((pair) => {
              const isActive = selectedPair === pair;
              const pairData = pairPrices[pair];
              const pairUp = pairData && pairData.change > 0;
              const pairDown = pairData && pairData.change < 0;
              return (
                <motion.button
                  key={pair}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPair(pair)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "bg-card/60 border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {pair}
                  {pairData && (
                    <span className={`text-xs font-normal ${
                      isActive
                        ? "text-white/80"
                        : pairUp
                        ? "text-success"
                        : pairDown
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {pairUp ? "+" : ""}{pairData.change.toFixed(2)}%
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Gráfico */}
      <section className="pb-6">
        <div className="container mx-auto px-4">
          <TradingViewChart symbol={selectedPair} />
        </div>
      </section>

      {/* Filtros */}
      <section className="pb-6">
        <div className="container mx-auto px-4">
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <div className="flex flex-wrap gap-4 flex-1">
                {/* Timeframe */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">TF:</span>
                  <div className="flex gap-1">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTimeframe === tf
                            ? "bg-primary text-white"
                            : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  <div className="flex gap-1">
                    {signalTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedType === type
                            ? type === "BUY"
                              ? "bg-success text-white"
                              : type === "SELL"
                              ? "bg-destructive text-white"
                              : "bg-primary text-white"
                            : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground shrink-0">
                <span className="text-foreground font-semibold">{activeSignals.length}</span> ativos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de sinais */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {activeSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                Nenhum sinal encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Ajusta os filtros para ver mais sinais.
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
