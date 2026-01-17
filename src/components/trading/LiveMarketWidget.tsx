import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketPrices } from "@/hooks/useMarketData";
import { Button } from "@/components/ui/button";

interface LiveMarketWidgetProps {
  compact?: boolean;
  maxItems?: number;
}

export function LiveMarketWidget({ compact = false, maxItems = 6 }: LiveMarketWidgetProps) {
  const { data: prices, isLoading, refetch, isFetching } = useMarketPrices();

  const formatPrice = (value: number | null | undefined, symbol: string) => {
    if (value === null || value === undefined) return "--.--";
    if (symbol.includes("JPY")) return Number(value).toFixed(3);
    if (symbol === "XAUUSD" || symbol === "BTCUSD") return Number(value).toFixed(2);
    return Number(value).toFixed(5);
  };

  const displayPrices = prices?.slice(0, maxItems) || [];

  if (isLoading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
              <div className="h-4 bg-muted rounded w-16 mb-2" />
              <div className="h-6 bg-muted rounded w-20 mb-1" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="font-semibold">Mercado ao Vivo</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isFetching && "animate-spin")} />
          {isFetching ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {displayPrices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Carregando dados do mercado...</p>
          <p className="text-xs mt-1">Os dados são atualizados automaticamente a cada 5 minutos</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        )}>
          {displayPrices.map((price, i) => {
            const changePercent = Number(price.change_percent) || 0;
            const isPositive = changePercent > 0;
            const isNegative = changePercent < 0;

            return (
              <motion.div
                key={price.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-3 rounded-lg border transition-all duration-300",
                  "bg-gradient-to-br from-background to-muted/30",
                  isPositive && "border-green-500/30 hover:border-green-500/50",
                  isNegative && "border-red-500/30 hover:border-red-500/50",
                  !isPositive && !isNegative && "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {price.symbol}
                  </span>
                  {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
                </div>
                <div className="font-mono font-bold text-lg leading-tight">
                  {formatPrice(Number(price.price), price.symbol)}
                </div>
                <div
                  className={cn(
                    "text-xs font-medium",
                    isPositive && "text-green-500",
                    isNegative && "text-red-500",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {isPositive && "+"}
                  {changePercent.toFixed(2)}%
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/50">
        <Activity className="h-3 w-3 text-green-500" />
        <span className="text-xs text-muted-foreground">
          Atualização automática a cada 5 minutos
        </span>
      </div>
    </motion.div>
  );
}
