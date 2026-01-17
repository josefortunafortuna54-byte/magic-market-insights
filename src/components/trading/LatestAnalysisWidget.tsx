import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ChevronRight, 
  Activity,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarketAnalysis } from "@/hooks/useMarketData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LatestAnalysisWidgetProps {
  maxItems?: number;
}

export function LatestAnalysisWidget({ maxItems = 3 }: LatestAnalysisWidgetProps) {
  const { data: analyses, isLoading } = useMarketAnalysis("H1");

  // Filter to only show BUY/SELL signals with high confidence
  const activeAnalyses = analyses
    ?.filter(a => a.signal_type !== "WAIT" && a.confidence >= 60)
    ?.slice(0, maxItems) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-20 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
              <div className="h-6 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeAnalyses.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h3 className="font-semibold mb-2">Aguardando Análises</h3>
        <p className="text-sm text-muted-foreground mb-4">
          As análises automáticas são atualizadas a cada 15 minutos
        </p>
        <Link to="/analises">
          <Button variant="outline" size="sm">
            Ver Todas as Análises
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeAnalyses.map((analysis, i) => {
        const isBuy = analysis.signal_type === "BUY";
        const isSell = analysis.signal_type === "SELL";
        const analyzedAt = analysis.analyzed_at
          ? formatDistanceToNow(new Date(analysis.analyzed_at), {
              addSuffix: true,
              locale: ptBR,
            })
          : "";

        return (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "glass-card p-4 border transition-all duration-300",
              isBuy && "border-green-500/30 hover:border-green-500/50",
              isSell && "border-red-500/30 hover:border-red-500/50"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  isBuy && "bg-green-500/20",
                  isSell && "bg-red-500/20"
                )}
              >
                {isBuy && <TrendingUp className="h-6 w-6 text-green-500" />}
                {isSell && <TrendingDown className="h-6 w-6 text-red-500" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-display font-bold">{analysis.symbol}</h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isBuy && "border-green-500 text-green-500",
                      isSell && "border-red-500 text-red-500"
                    )}
                  >
                    {analysis.signal_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {analysis.timeframe}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className={cn(
                    "font-medium",
                    analysis.confidence >= 75 && "text-green-500",
                    analysis.confidence >= 50 && analysis.confidence < 75 && "text-yellow-500"
                  )}>
                    {analysis.confidence}% confiança
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {analyzedAt}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Entrada</div>
                <div className="font-mono font-bold">
                  {analysis.entry_price ? Number(analysis.entry_price).toFixed(5) : "--.--"}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      <Link to="/analises" className="block">
        <Button variant="outline" className="w-full">
          Ver Todas as Análises
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}
