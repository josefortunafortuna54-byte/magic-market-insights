import { useQuery } from "@tanstack/react-query";
import { RefreshCw, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { formatSymbol, formatTimeframe, formatType } from "@/lib/format";
import { PLAN_LIMITS, TV_INTERVALS } from "@/lib/gating";
import { supabase } from "@/lib/supabaseClient";
import type { Signal } from "@/lib/types";

interface SignalRow {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: string;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  reasons: string[];
  created_at: string;
  status: string;
  tier: string | null;
  risk_reward: number | null;
  expires_at: string | null;
  analysis: string | null;
  probability_score: number | null;
  smc_setup: string | null;
}

export default function SinalChart() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tier, loading: subLoading } = useSubscription();
  const allUnlocked = subLoading || tier === "pro" || tier === "premium";

  const { data: signal, isLoading } = useQuery<Signal | null, Error>({
    queryKey: ["signal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as SignalRow;
      return {
        id: String(row.id),
        pair: formatSymbol(row.symbol),
        timeframe: formatTimeframe(row.timeframe),
        type: formatType(row.signal_type),
        confidence: Number(row.confidence) || 50,
        entry: Number(row.entry_price) || 0,
        stopLoss: Number(row.stop_loss) || 0,
        takeProfit: Number(row.target_price) || 0,
        reasons: Array.isArray(row.reasons) ? row.reasons : [],
        createdAt: row.created_at ?? new Date().toISOString(),
        status: "active",
        tier: (row.tier as Signal["tier"]) ?? "free",
        riskReward: row.risk_reward != null ? Number(row.risk_reward) : undefined,
        expiresAt: row.expires_at ?? undefined,
        analysis: row.analysis ?? undefined,
        probabilityScore: row.probability_score != null ? Number(row.probability_score) : undefined,
        smcSetup: row.smc_setup ?? undefined,
      };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout noFooter>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">A carregar análise…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!signal) {
    return (
      <Layout noFooter>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-destructive mb-2">Sinal não encontrado</p>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const limits = PLAN_LIMITS[allUnlocked ? "premium" : tier] ?? PLAN_LIMITS.free;
  const pairNorm = signal.pair.replace(/[^A-Za-z]/g, "");
  const pairAllowed = limits.pairs.some((p) => p.replace(/[^A-Za-z]/g, "") === pairNorm);
  const tfAllowed =
    signal.timeframe === "Todos" ||
    limits.timeframes.includes(signal.timeframe as "M15" | "H1" | "H4");
  if (!allUnlocked && (!pairAllowed || !tfAllowed)) {
    return (
      <Layout noFooter>
        <div className="relative flex h-screen w-full items-center justify-center bg-background px-4">
          <PremiumLock
            title={`${signal.pair} ${signal.timeframe}`}
            description="Desbloqueia todos os pares e timeframes com o plano PRO."
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Fechar"
            className="absolute right-3 top-3 text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout noFooter>
      <div className="relative h-screen w-full bg-black">
        <TradingViewChart
          symbol={signal.pair}
          interval={TV_INTERVALS[signal.timeframe ?? "M15"] ?? "15"}
          height="100%"
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Fechar"
            className="pointer-events-auto bg-black/40 text-white hover:bg-black/60"
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="truncate rounded-lg bg-black/40 px-3 py-1.5 font-display text-lg font-bold text-white">
            {signal.pair} · {signal.timeframe}
          </span>
          <span className="w-10 shrink-0" />
        </div>
      </div>
    </Layout>
  );
}