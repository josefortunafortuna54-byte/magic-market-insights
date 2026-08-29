import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Filter, Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Lock, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { useSignals } from "@/hooks/useSignals";
import { useSubscription } from "@/hooks/useSubscription";
import { useLivePrices } from "@/hooks/useLivePrices";


const timeframes = ["Todos", "M15", "H1", "H4"];
const signalTypes = ["Todos", "BUY", "SELL", "AGUARDAR"];

const FREE_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY"];
const FREE_TIMEFRAMES = ["M15"];

const ALL_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/GBP", "USD/CHF", "NZD/USD", "USD/CAD", "XAU/USD", "BTC/USD"];

const tvIntervals: Record<string, string> = {
  "M15": "15", "H1": "60", "H4": "240",
};

function PremiumLock({ timeframe }: { timeframe: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 text-center border-accent/20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="h-7 w-7 text-accent" />
      </div>
      <h3 className="font-display text-lg font-bold mb-2">
        Sinais {timeframe} — Exclusivo Premium
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Acede a sinais em todos os timeframes com análise técnica completa.
        RSI, EMA, MACD, Bollinger e Estocástico.
      </p>
      <Link to="/planos">
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-glow-gold)" }}>
          <Crown className="h-4 w-4" />
          Ver Planos Premium
        </button>
      </Link>
    </motion.div>
  );
}

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("M15");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");

  const { signals: supabaseSignals, loading, error, refetch } = useSignals();
  const { user, isPremium, loading: subLoading } = useSubscription();

  const { prices, loading: pricesLoading, refetch: refetchPrices } = useLivePrices(ALL_PAIRS);

  const allSignals = supabaseSignals;

  const visibleSignals = allSignals.filter(s => {
    if (isPremium) return true;
    return FREE_PAIRS.includes(s.pair) && FREE_TIMEFRAMES.includes(s.timeframe);
  });

  const visiblePairs = isPremium
    ? [...new Set(allSignals.map(s => s.pair))]
    : FREE_PAIRS.filter(p => allSignals.some(s => s.pair === p));

  const availableTimeframes = isPremium ? timeframes : ["Todos", "M15"];

  useEffect(() => {
    if (!isPremium && !["Todos", "M15"].includes(selectedTimeframe)) {
      setSelectedTimeframe("M15");
    }
  }, [isPremium, selectedTimeframe]);

  const filteredSignals = visibleSignals.filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter((s) => s.status === "active" || !s.status);

  const currentPrice = prices[selectedPair] ?? { price: "—", change: 0 };
  const isUp = currentPrice.change > 0;
  const isFlat = currentPrice.change === 0;
  const tvSymbol = selectedPair.replace("/", "");
  const tvInterval = selectedTimeframe !== "Todos" ? (tvIntervals[selectedTimeframe] ?? "60") : "60";
  const tvPrefix = tvSymbol === "BTCUSD" ? "COINBASE" : "FX";
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${tvPrefix}:${tvSymbol}&interval=${tvInterval}`;

  const isPremiumTimeframe = !isPremium && ["H1", "H4"].includes(selectedTimeframe);

  return (
    <Layout>
      <div>
        {/* Barra de controlo */}
        <div className="container mx-auto px-4 pt-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <h1 className="font-display text-xl font-bold">Painel de Sinais</h1>
              {(loading || pricesLoading) && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
            </div>

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
            {visiblePairs.map((pair) => {
              const isActive = selectedPair === pair;
              const pairData = prices[pair];
              const pairUp = pairData && pairData.change > 0;
              const pairDown = pairData && pairData.change < 0;
              return (
                <motion.button key={pair} whileTap={{ scale: 0.97 }} onClick={() => setSelectedPair(pair)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border ${isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-card/60 border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                  {pair}
                  {pairData && pairData.price !== "—" && (
                    <span className={`text-xs ${isActive ? "text-white/80" : pairUp ? "text-success" : pairDown ? "text-destructive" : "text-muted-foreground"}`}>
                      {pairUp ? "+" : ""}{pairData.change.toFixed(2)}%
                    </span>
                  )}
                </motion.button>
              );
            })}

            {!isPremium && !subLoading && (
              <Link to="/planos">
                <motion.button whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border border-accent/30 bg-accent/5 text-accent/70 hover:bg-accent/10 transition-all">
                  <Lock className="h-3 w-3" />
                  +5 pares Premium
                </motion.button>
              </Link>
            )}
          </div>
        </div>

        {/* Gráfico */}
        <div className="px-4">
          <div style={{ height: "calc(100vh - 230px)", minHeight: "480px", width: "100%" }}>
            <TradingViewChart symbol={selectedPair} interval={tvInterval} height="100%" />
          </div>
        </div>

        <div className="container mx-auto px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Gráfico TradingView · Indicadores incluídos: EMA, RSI, MACD, Bollinger, Estocástico
            {selectedTimeframe !== "Todos" && <> · Timeframe: {selectedTimeframe}</>}
          </p>
        </div>

        {/* Filtros */}
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
                  {timeframes.map((tf) => {
                    const isLocked = !isPremium && ["H1", "H4"].includes(tf);
                    const isSelected = selectedTimeframe === tf;
                    return (
                      <button key={tf}
                        onClick={() => !isLocked && setSelectedTimeframe(tf)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          isSelected ? "bg-primary text-white"
                          : isLocked ? "bg-secondary/30 text-muted-foreground/40 cursor-not-allowed"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}>
                        {isLocked && <Lock className="h-2.5 w-2.5" />}
                        {tf}
                      </button>
                    );
                  })}
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
                <button onClick={() => { refetch(); refetchPrices(); }} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de sinais */}
        <div className="container mx-auto px-4 pb-24">
          {isPremiumTimeframe ? (
            <PremiumLock timeframe={selectedTimeframe} />
          ) : loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => (
                <div key={i} className="glass-card p-6 h-64 animate-pulse">
                  <div className="h-4 bg-muted/50 rounded mb-4 w-1/2" />
                  <div className="h-3 bg-muted/30 rounded mb-2 w-3/4" />
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
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals.map((signal, i) => (
                  <SignalCard key={signal.id} signal={signal} index={i} />
                ))}
              </div>

              {!isPremium && !subLoading && user && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-8 glass-card p-6 border-accent/20 flex flex-col sm:flex-row items-center justify-between gap-4"
                  style={{ background: "linear-gradient(135deg, rgba(250,198,117,0.05) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Estás a ver apenas sinais M15 de 3 pares</p>
                      <p className="text-xs text-muted-foreground">Premium desbloqueia H1, H4, XAU/USD, BTC e mais 5 pares Forex</p>
                    </div>
                  </div>
                  <Link to="/planos">
                    <button className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white whitespace-nowrap"
                      style={{ background: "var(--gradient-gold)" }}>
                      <Crown className="h-4 w-4" />
                      Ver Planos
                    </button>
                  </Link>
                </motion.div>
              )}

              {!user && !subLoading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-8 glass-card p-6 border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">Cria uma conta para aceder a mais sinais</p>
                    <p className="text-xs text-muted-foreground">Regista-te gratuitamente e acede a sinais M15</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <Link to="/login">
                      <button className="px-4 py-2 rounded-xl text-sm font-medium border border-border/60 hover:bg-secondary/60 transition-all">
                        Entrar
                      </button>
                    </Link>
                    <Link to="/registro">
                      <button className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: "var(--gradient-primary)" }}>
                        Criar Conta
                      </button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
