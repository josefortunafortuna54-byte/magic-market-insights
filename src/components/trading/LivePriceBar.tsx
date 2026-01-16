import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketPrices } from "@/hooks/useMarketData";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useAuth } from "@/contexts/AuthContext";

export function LivePriceBar() {
  const { isPremium } = useAuth();
  const { data: prices, isLoading: pricesLoading } = useMarketPrices();
  const { data: pairs, isLoading: pairsLoading } = useTradingPairs();

  const isLoading = pricesLoading || pairsLoading;

  // Filter pairs based on user plan
  const availablePairs = pairs?.filter((p) => !p.is_premium || isPremium) || [];

  // Match prices with pairs
  const pricesWithPairs = availablePairs.map((pair) => {
    const price = prices?.find((p) => p.symbol === pair.symbol.replace("/", ""));
    return { pair, price };
  });

  const formatPrice = (value: number | null | undefined, symbol: string) => {
    if (value === null || value === undefined) return "--.--";
    if (symbol.includes("JPY")) return value.toFixed(3);
    if (symbol === "XAUUSD" || symbol === "BTCUSD") return value.toFixed(2);
    return value.toFixed(5);
  };

  if (isLoading) {
    return (
      <div className="w-full border-b border-border/50 bg-card/50 py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 overflow-x-auto animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-5 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pricesWithPairs.length) {
    return null;
  }

  return (
    <div className="w-full border-b border-border/50 bg-gradient-to-r from-card/80 to-card/50 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500 font-medium">PREÇOS EM TEMPO REAL</span>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {pricesWithPairs.map(({ pair, price }, index) => {
            const changePercent = price?.change_percent ? Number(price.change_percent) : 0;
            const isPositive = changePercent > 0;
            const isNegative = changePercent < 0;

            return (
              <motion.div
                key={pair.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 shrink-0"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {pair.symbol}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">
                    {price
                      ? formatPrice(Number(price.price), pair.symbol)
                      : "--.--"}
                  </span>
                  {price && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        isPositive && "text-green-500",
                        isNegative && "text-red-500",
                        !isPositive && !isNegative && "text-muted-foreground"
                      )}
                    >
                      {isPositive && <TrendingUp className="h-3 w-3" />}
                      {isNegative && <TrendingDown className="h-3 w-3" />}
                      <span>
                        {isPositive ? "+" : ""}
                        {changePercent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
                {index < pricesWithPairs.length - 1 && (
                  <div className="w-px h-4 bg-border/50" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
