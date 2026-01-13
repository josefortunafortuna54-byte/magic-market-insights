import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import type { TradingPair } from "@/hooks/useTradingPairs";
import { Link } from "react-router-dom";

interface PairSelectorProps {
  pairs: TradingPair[];
  selectedPair: string;
  onSelect: (symbol: string) => void;
}

export function PairSelector({ pairs, selectedPair, onSelect }: PairSelectorProps) {
  const { isPremium } = useAuth();

  const freePairs = pairs.filter((p) => !p.is_premium);
  const premiumPairs = pairs.filter((p) => p.is_premium);

  return (
    <div className="space-y-4">
      {/* Free Pairs */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Pares Disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {freePairs.map((pair) => (
            <Button
              key={pair.id}
              variant={selectedPair === pair.symbol ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(pair.symbol)}
            >
              {pair.symbol}
            </Button>
          ))}
        </div>
      </div>

      {/* Premium Pairs */}
      {premiumPairs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-muted-foreground">Pares Premium</p>
            {!isPremium && (
              <Badge variant="warning" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {premiumPairs.map((pair) => (
              isPremium ? (
                <Button
                  key={pair.id}
                  variant={selectedPair === pair.symbol ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(pair.symbol)}
                >
                  {pair.symbol}
                </Button>
              ) : (
                <Link key={pair.id} to="/planos">
                  <Button variant="outline" size="sm" className="opacity-50" disabled>
                    <Lock className="h-3 w-3 mr-1" />
                    {pair.symbol}
                  </Button>
                </Link>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
