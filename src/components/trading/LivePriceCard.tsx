import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketPrice } from "@/hooks/useMarketData";

interface LivePriceCardProps {
  symbol: string;
  price?: MarketPrice;
  isLoading?: boolean;
}

export function LivePriceCard({ symbol, price, isLoading }: LivePriceCardProps) {
  const formatPrice = (value: number | null | undefined, digits: number = 5) => {
    if (value === null || value === undefined) return "--.--";
    return value.toFixed(digits);
  };

  const getPriceDecimals = (sym: string) => {
    if (sym.includes("JPY")) return 3;
    if (sym === "XAUUSD") return 2;
    if (sym === "BTCUSD") return 2;
    return 5;
  };

  const changePercent = price?.change_percent || 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const decimals = getPriceDecimals(symbol);

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-16 mb-2" />
        <div className="h-8 bg-muted rounded w-24 mb-2" />
        <div className="h-4 bg-muted rounded w-12" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-card p-4 transition-all duration-300",
        isPositive && "border-green-500/30",
        isNegative && "border-red-500/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{symbol}</span>
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500">LIVE</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display text-2xl font-bold">
          {price ? formatPrice(Number(price.price), decimals) : "--.--"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {isPositive && <TrendingUp className="h-4 w-4 text-green-500" />}
        {isNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
        {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
        <span
          className={cn(
            "text-sm font-medium",
            isPositive && "text-green-500",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-muted-foreground"
          )}
        >
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      </div>

      {price?.high_24h && price?.low_24h && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex justify-between text-xs text-muted-foreground">
            <div>
              <span className="block">Alta 24h</span>
              <span className="text-foreground font-medium">
                {formatPrice(Number(price.high_24h), decimals)}
              </span>
            </div>
            <div className="text-right">
              <span className="block">Baixa 24h</span>
              <span className="text-foreground font-medium">
                {formatPrice(Number(price.low_24h), decimals)}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
