import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { useSignals } from "@/hooks/useSignals";
import { mockSignals } from "@/data/mockSignals";

const timeframes = ["Todos", "M15", "H1", "H4"];
const signalTypes = ["Todos", "BUY", "SELL", "AGUARDAR"];

const pairPrices: Record<string, { price: string; change: number }> = {
  "EUR/USD": { price: "1.15550", change: 0.02 },
  "GBP/USD": { price: "1.27100", change: -0.08 },
  "USD/JPY": { price: "148.500", change: 0.12 },
  "AUD/USD": { price: "0.63420", change: -0.03 },
  "EUR/GBP": { price: "0.85890", change: 0.01 },
  "USD/CHF": { price: "0.89750", change: -0.05 },
};

const tvIntervals: Record<string, string> = {
  "M5": "5", "M15": "15", "H1": "60", "H4": "240", "D1": "D",
};

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("H1");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [currentPrice, setCurrentPrice] = useState(pairPrices["EUR/USD"]);

  const { signals: supabaseSignals, loading, error, refetch } = useSignals();

  // Usa dados do Supabase se disponíveis, senão usa mockSignals como fallback
  const allSignals = supabaseSignals.length > 0 ? supabaseSignals : mockSignals;

  useEffect(() => {
    setCurrentPrice(pairPrices[selectedPair] ?? { price: "—", change: 0 });
  }, [selectedPair]);

  const filteredSignals = allSignals.filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter((s) => s.status === "active" || !s.status);
  const pairs = [...new Set(allSignals.map((s) => s.pair))];
  const isUp = currentPrice.change > 0;
  const isFlat = currentPrice.change === 0;
  const tvSymbol = selectedPair.replace("/", "");
  const tvInterval = selectedTimeframe !== "Todos" ? (tvIntervals[selectedTimeframe] ?? "60") : "60";
  const tvUrl = `https://www.tradingview.com/chart/?symbol=FX:${tvSymbol}&interval=${tvInterval}`;

  return (
    <Layout>
      <div>
        {/* Barra de controlo */}
        <div className="container mx-auto px-4 pt-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Título + live */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <h1 className="font-display text-xl font-bold">Painel de Sinais</h1>
              {loading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
              {error && <span className="text-xs text-warning">(mock)</span>}
            </div>

            {/* Preço + botão TV */}
            <motion.div key={selectedPair} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{selectedPair}</p>
                <p className="font-display text-xl font-bold font-trading leading-none">{currentPrice.price}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${isFlat ? "bg-muted/50 text-muted-foreground" : isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {isFlat ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isUp ? "+" : ""}{currentPrice.change.toFixed(2)}%
              </div>
              <a href={tvUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                <ExternalLink className="h-3 w-3" />
                TradingView
              </a>
            </motion.div>
          </div>

          {/* Seletor de pares */}
          <div className="flex flex-wrap gap-2 mt-3">
            {pairs.map((pair) => {
              const isActive = selectedPair === pair;
              const pairData = pairPrices[pair];
              const pairUp = pairData && pairData.change > 0;
              const pairDown = pairData && pairData.change < 0;
              return (
                <motion.button key={pair} whileTap={{ scale: 0.97 }} onClick={() => setSelectedPair(pair)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border ${isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-card/60 border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                  {pair}
                  {pairData && (
                    <span className={`text-xs ${isActive ? "text-white/80" : pairUp ? "text-success" : pairDown ? "text-destructive" : "text-muted-foreground"}`}>
                      {pairUp ? "+" : ""}{pairData.change.toFixed(2)}%
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Gráfico — ocupa o máximo do ecrã */}
        <div className="px-4">
          <div style={{ height: "calc(100vh - 210px)", minHeight: "480px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <TradingViewChart symbol={selectedPair} interval={tvInterval} />
          </div>
        </div>

        {/* Nota + filtros */}
        <div className="container mx-auto px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Desenhos não são guardados no widget. Para guardar,
            <a href={tvUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">abre o TradingView completo</a>.
          </p>
        </div>

        <div className="container mx-auto px-4 pb-6">
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">TF:</span>
                <div className="flex gap-1 flex-wrap">
                  {timeframes.map((tf) => (
                    <button key={tf} onClick={() => setSelectedTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedTimeframe === tf ? "bg-primary text-white" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tipo:</span>
                <div className="flex gap-1">
                  {signalTypes.map((type) => (
                    <button key={type} onClick={() => setSelectedType(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedType === type ? type === "BUY" ? "bg-success text-white" : type === "SELL" ? "bg-destructive text-white" : "bg-primary text-white" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  <span className="text-foreground font-semibold">{activeSignals.length}</span> sinais ativos
                </span>
                <button onClick={refetch} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de sinais */}
        <div className="container mx-auto px-4 pb-24">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => (
                <div key={i} className="glass-card p-6 h-64 animate-pulse">
                  <div className="h-4 bg-muted/50 rounded mb-4 w-1/2" />
                  <div className="h-3 bg-muted/30 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Nenhum sinal encontrado</h3>
              <p className="text-sm text-muted-foreground">Ajusta os filtros ou aguarda novos sinais.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSignals.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
