import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Filter, Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Lock, Crown, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { PlanUpsellModal } from "@/components/signals/PlanUpsellModal";
import { useSignals } from "@/hooks/useSignals";
import { useSubscription } from "@/hooks/useSubscription";
import { useLivePrices } from "@/hooks/useLivePrices";
import {
  ALL_PAIRS,
  TIMEFRAMES,
  SIGNAL_TYPES,
  TV_INTERVALS,
  PLAN_LIMITS,
  isWeekendUtc,
} from "@/lib/gating";
import { decimalsFor } from "@/lib/format";

const SMC_SETUPS = ["Todos", "BOS", "CHoCH", "OB", "FVG", "COMBO"];

function formatPrice(pair: string, price: string): string {
  if (price === "" || price === "—") return "—";
  const n = Number(price);
  if (!isFinite(n)) return price;
  return n.toFixed(decimalsFor(pair));
}

export default function Analises() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("M15");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [smcFilter, setSmcFilter] = useState("Todos");
  const [upsellOpen, setUpsellOpen] = useState(false);

  const { signals: supabaseSignals, loading, refetch } = useSignals();
  const { user, loading: subLoading, canAccessPair, canAccessTimeframe } = useSubscription();

  const { prices, loading: pricesLoading, refetch: refetchPrices } = useLivePrices(ALL_PAIRS);

  const allSignals = supabaseSignals;
  // Enquanto o plano não está confirmado NADA é bloqueado — um cliente
  // premium nunca deve ver restrições, nem sequer durante o arranque.
  const gatingOn = !subLoading;
  const weekend = isWeekendUtc();

  const freePairs = PLAN_LIMITS.free.pairs;
  const freeTimeframes = PLAN_LIMITS.free.timeframes;

  // Filtro de pares: ALL_PAIRS + quaisquer pares presentes nos sinais
  // (inclui cripto como ETH/USDT gerada ao fim de semana).
  const pairOptions = useMemo(() => {
    const set = new Set<string>(ALL_PAIRS);
    allSignals.forEach((s) => {
      if (s.pair) set.add(s.pair);
    });
    return Array.from(set);
  }, [allSignals]);

  // Sinais visíveis por plano: o tier dá acesso a mais pares/timeframes.
  const visibleSignals = allSignals.filter(
    (s) => !gatingOn || (canAccessPair(s.pair) && canAccessTimeframe(s.timeframe))
  );

  const filteredSignals = visibleSignals.filter((signal) => {
    if (selectedTimeframe !== "Todos" && signal.timeframe !== selectedTimeframe) return false;
    if (selectedType !== "Todos" && signal.type !== selectedType) return false;
    if (smcFilter !== "Todos" && signal.smcSetup !== smcFilter) return false;
    return true;
  });

  const activeSignals = filteredSignals.filter(
    (s) => s.status === "active" || s.status === "pending" || !s.status
  );

  // Se o plano mudou enquanto um par/timeframe bloqueado estava selecionado,
  // repõe valores sempre acessíveis.
  useEffect(() => {
    if (!gatingOn) return;
    if (selectedTimeframe !== "Todos" && !canAccessTimeframe(selectedTimeframe)) {
      setSelectedTimeframe("M15");
    }
    if (!canAccessPair(selectedPair)) {
      setSelectedPair("EUR/USD");
    }
  }, [gatingOn, selectedTimeframe, selectedPair, canAccessPair, canAccessTimeframe]);

  const currentPrice = prices[selectedPair] ?? { price: "—", change: 0 };
  const isUp = currentPrice.change > 0;
  const isFlat = currentPrice.change === 0;
  const tvSymbol = selectedPair.replace("/", "");
  const tvInterval = selectedTimeframe !== "Todos" ? (TV_INTERVALS[selectedTimeframe] ?? "60") : "60";
  const tvPrefix = tvSymbol === "BTCUSD" ? "COINBASE" : "FX";
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${tvPrefix}:${tvSymbol}&interval=${tvInterval}`;

  const lockedTimeframe = gatingOn && selectedTimeframe !== "Todos" && !canAccessTimeframe(selectedTimeframe);
  const lockedPairsCount = ALL_PAIRS.filter((p) => !canAccessPair(p)).length;
  const lockedTimeframesCount = TIMEFRAMES.filter((tf) => tf !== "Todos" && !canAccessTimeframe(tf)).length;
  const showUpsellChip = gatingOn && (lockedPairsCount > 0 || lockedTimeframesCount > 0);
  const showPremiumBanner = user && !subLoading && !canAccessPair("BTC/USD");

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
                <p className="font-display text-xl font-bold font-trading leading-none">{formatPrice(selectedPair, currentPrice.price)}</p>
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
            {pairOptions.map((pair) => {
              const locked = gatingOn && !canAccessPair(pair);
              const isActive = selectedPair === pair;
              const pairData = prices[pair];
              const pairUp = pairData && pairData.change > 0;
              const pairDown = pairData && pairData.change < 0;
              return (
                <motion.button key={pair} whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (locked) {
                      setUpsellOpen(true);
                      return;
                    }
                    setSelectedPair(pair);
                  }}
                  aria-label={locked ? `Desbloquear ${pair}` : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    locked
                      ? "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10"
                      : isActive
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-card/60 border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}>
                  {locked && <Lock className="h-3 w-3" />}
                  {pair}
                  {!locked && pairData && pairData.price !== "—" && (
                    <span className={`text-xs ${isActive ? "text-white/80" : pairUp ? "text-success" : pairDown ? "text-destructive" : "text-muted-foreground"}`}>
                      {pairUp ? "+" : ""}{pairData.change.toFixed(2)}%
                    </span>
                  )}
                </motion.button>
              );
            })}

            {showUpsellChip && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setUpsellOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border border-accent/30 bg-accent/5 text-accent/70 hover:bg-accent/10 transition-all">
                <Lock className="h-3 w-3" />
                {lockedPairsCount > 0 ? `+${lockedPairsCount} pares Premium` : `+${lockedTimeframesCount} timeframe Premium`}
              </motion.button>
            )}
          </div>
        </div>

        {/* Aviso de fim de semana */}
        {weekend && (
          <div className="container mx-auto px-4 pb-2">
            <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">Mercado fechado (fim de semana)</p>
                <p className="text-xs text-muted-foreground">Sinais forex regressam segunda-feira.</p>
                <p className="text-xs text-muted-foreground">Ao fim de semana a IA do TMT gera sinais de BTC e ETH para todos os planos.</p>
              </div>
            </div>
          </div>
        )}

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
                  {TIMEFRAMES.map((tf) => {
                    const locked = gatingOn && tf !== "Todos" && !canAccessTimeframe(tf);
                    const isSelected = selectedTimeframe === tf;
                    return (
                      <button key={tf}
                        onClick={() => {
                          if (locked) {
                            setUpsellOpen(true);
                            return;
                          }
                          setSelectedTimeframe(tf);
                        }}
                        aria-label={locked ? `Desbloquear ${tf}` : undefined}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          locked
                            ? "bg-accent/5 text-accent border border-accent/30"
                            : isSelected
                              ? "bg-primary text-white"
                              : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}>
                        {locked && <Lock className="h-2.5 w-2.5" />}
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tipo:</span>
                <div className="flex gap-1">
                  {SIGNAL_TYPES.map((type) => (
                    <button key={type} onClick={() => setSelectedType(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedType === type ? type === "BUY" ? "bg-success text-white" : type === "SELL" ? "bg-destructive text-white" : "bg-primary text-white" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SMC:</span>
                <div className="flex gap-1 flex-wrap">
                  {SMC_SETUPS.map((s) => (
                    <button key={s} onClick={() => setSmcFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${smcFilter === s ? "bg-primary text-white" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                      {s}
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
          {lockedTimeframe ? (
            <PremiumLock
              title={`Sinais ${selectedTimeframe} — Exclusivo Premium`}
              description="Acede a sinais em todos os timeframes com análise técnica completa. RSI, EMA, MACD, Bollinger e Estocástico."
            />
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

              {showPremiumBanner && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-8 glass-card p-6 border-accent/20 flex flex-col sm:flex-row items-center justify-between gap-4"
                  style={{ background: "linear-gradient(135deg, rgba(250,198,117,0.05) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Estás a ver apenas sinais do plano gratuito ({freePairs.length} pares · {freeTimeframes.join(" + ")})
                      </p>
                      <p className="text-xs text-muted-foreground">Basic, Pro e Premium desbloqueiam mais pares e timeframes</p>
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

        <PlanUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />
      </div>
    </Layout>
  );
}