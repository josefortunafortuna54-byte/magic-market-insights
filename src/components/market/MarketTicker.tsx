import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Clock, RefreshCw } from "lucide-react";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";

interface PriceCardProps {
  symbol: string;
  price: number;
  changePercent: number | null;
  high24h: number | null;
  low24h: number | null;
  updatedAt: string;
  index: number;
}

function PriceCard({ symbol, price, changePercent, high24h, low24h, updatedAt, index }: PriceCardProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(timer);
  }, [price]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative glass-card p-4 hover:border-primary/40 transition-all duration-300 group overflow-hidden ${
        flash ? (isPositive ? "ring-1 ring-success/50" : "ring-1 ring-destructive/50") : ""
      }`}
    >
      {/* Live indicator */}
      <div className="absolute top-2 right-2">
        <span className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-[10px] text-success font-medium">LIVE</span>
        </span>
      </div>

      {/* Symbol */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm">{symbol}</h3>
          <p className="text-[10px] text-muted-foreground">Forex</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-3">
        <motion.p
          key={price}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          className="font-mono text-xl font-bold"
        >
          {price.toFixed(5)}
        </motion.p>
        <div className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="text-sm font-semibold">
            {isPositive ? "+" : ""}{(changePercent ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* High/Low */}
      {high24h && low24h && (
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-success/10 rounded px-2 py-1">
            <span className="text-muted-foreground">H: </span>
            <span className="font-mono text-success">{high24h.toFixed(5)}</span>
          </div>
          <div className="bg-destructive/10 rounded px-2 py-1">
            <span className="text-muted-foreground">L: </span>
            <span className="font-mono text-destructive">{low24h.toFixed(5)}</span>
          </div>
        </div>
      )}

      {/* Last update */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          {formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </motion.div>
  );
}

export function MarketTicker() {
  const { data: prices, isLoading, error, refetch, isFetching } = useMarketPrices();

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-destructive text-sm">Erro ao carregar preços</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Mercado ao Vivo</h2>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Tempo Real
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : prices && prices.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {prices.map((p, i) => (
              <PriceCard
                key={p.id}
                symbol={p.symbol}
                price={p.price}
                changePercent={p.change_percent}
                high24h={p.high_24h}
                low24h={p.low_24h}
                updatedAt={p.updated_at}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum preço disponível</p>
          <p className="text-xs text-muted-foreground mt-1">Os preços serão atualizados em breve</p>
        </div>
      )}
    </div>
  );
}
