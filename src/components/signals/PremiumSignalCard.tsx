import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, Shield, Percent, Bot, Copy, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;
  type: "BUY" | "SELL" | "AGUARDAR";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  createdAt: string;
  status?: "active" | "tp" | "sl";
}

interface PremiumSignalCardProps {
  signal: Signal;
  index?: number;
}

const aiComments: Record<string, string> = {
  BUY: "🤖 Pressão compradora detectada. Momentum favorável para entrada longa com suporte técnico sólido.",
  SELL: "🤖 Sinal de fraqueza no mercado. Reversão provável com pressão vendedora e indicadores alinhados.",
  AGUARDAR: "🤖 Mercado em consolidação. Aguardar confirmação de direção antes de entrar.",
};

function getRiskLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 85) return { label: "Baixo", color: "text-success" };
  if (confidence >= 70) return { label: "Médio", color: "text-warning" };
  return { label: "Alto", color: "text-destructive" };
}

export function PremiumSignalCard({ signal, index = 0 }: PremiumSignalCardProps) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState("");
  
  const isBuy = signal.type === "BUY";
  const isSell = signal.type === "SELL";
  const risk = getRiskLevel(signal.confidence);
  const riskReward = Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss);

  useEffect(() => {
    if (signal.status !== "active") return;
    const update = () => {
      const created = new Date(signal.createdAt);
      const expires = new Date(created.getTime() + 4 * 60 * 60 * 1000); // 4h expiry
      const now = new Date();
      const diff = expires.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expirado");
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${h}h ${m}m`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [signal.createdAt, signal.status]);

  const copySignal = () => {
    const text = `📊 ${signal.pair} | ${signal.type}\n💰 Entrada: ${signal.entry.toFixed(5)}\n🛑 SL: ${signal.stopLoss.toFixed(5)}\n🎯 TP: ${signal.takeProfit.toFixed(5)}\n📈 Confiança: ${signal.confidence}%`;
    navigator.clipboard.writeText(text);
    toast({ title: "Sinal copiado!", description: "Pronto para partilhar." });
  };

  const formatPrice = (price: number) => price < 100 ? price.toFixed(5) : price.toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`glass-card-premium overflow-hidden group transition-all duration-300 hover:border-primary/30 ${
        signal.status === "tp" ? "border-success/20" : signal.status === "sl" ? "border-destructive/20" : ""
      }`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isBuy ? "bg-gradient-to-r from-success to-success/50" : isSell ? "bg-gradient-to-r from-destructive to-destructive/50" : "bg-gradient-to-r from-warning to-warning/50"}`} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-lg font-bold">{signal.pair}</h3>
            <Badge variant="outline" className="text-[10px] font-mono">{signal.timeframe}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {signal.status === "tp" && (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" /> TP
              </Badge>
            )}
            {signal.status === "sl" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> SL
              </Badge>
            )}
            {signal.status === "active" && timeLeft && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Clock className="h-3 w-3" /> {timeLeft}
              </Badge>
            )}
            <div className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 ${
              isBuy ? "bg-success/15 text-success border border-success/30" : 
              isSell ? "bg-destructive/15 text-destructive border border-destructive/30" : 
              "bg-warning/15 text-warning border border-warning/30"
            }`}>
              {isBuy ? <TrendingUp className="h-4 w-4" /> : isSell ? <TrendingDown className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {signal.type}
            </div>
          </div>
        </div>

        {/* AI Comment */}
        <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/10">
          <div className="flex items-start gap-2">
            <Bot className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {signal.reasons[0] || aiComments[signal.type]}
            </p>
          </div>
        </div>

        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Entrada</p>
            <p className="font-mono text-sm font-bold">{formatPrice(signal.entry)}</p>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <p className="text-[10px] text-destructive mb-1 flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> SL
            </p>
            <p className="font-mono text-sm font-bold text-destructive">{formatPrice(signal.stopLoss)}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3 text-center">
            <p className="text-[10px] text-success mb-1 flex items-center justify-center gap-1">
              <Target className="h-3 w-3" /> TP
            </p>
            <p className="font-mono text-sm font-bold text-success">{formatPrice(signal.takeProfit)}</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center justify-between text-xs mb-4 px-1">
          <div className="flex items-center gap-1">
            <Percent className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Confiança:</span>
            <span className={`font-bold ${signal.confidence >= 80 ? "text-success" : signal.confidence >= 60 ? "text-warning" : "text-muted-foreground"}`}>
              {signal.confidence}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">R:R</span>
            <span className={`font-bold ${riskReward >= 2 ? "text-success" : "text-warning"}`}>
              1:{riskReward.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className={`h-3 w-3 ${risk.color}`} />
            <span className={`font-bold ${risk.color}`}>{risk.label}</span>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence}%` }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`h-full rounded-full ${
              signal.confidence >= 80 ? "bg-success" : signal.confidence >= 60 ? "bg-warning" : "bg-muted"
            }`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={copySignal}>
            <Copy className="h-3 w-3 mr-1" /> Copiar
          </Button>
          <Link to="/analises" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="h-3 w-3 mr-1" /> Gráfico
            </Button>
          </Link>
        </div>

        {/* Time */}
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </motion.div>
  );
}
