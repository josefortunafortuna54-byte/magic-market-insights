import { useEffect, useState } from "react";
import { BarChart3, CheckCircle, Clock, Gem, Receipt, RefreshCw, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import * as adminApi from "@/lib/adminApi";

export interface AdminDashboardStats {
  total: number;
  active: number;
  tp: number;
  sl: number;
  users: number;
  premium: number;
  expiring: number;
  pendingReceipts: number;
}

interface AdminDashboardTabProps {
  stats: AdminDashboardStats;
  busy: boolean;
  run: (label: string, fn: () => Promise<number>) => void;
  onRefresh: () => void;
}

export function AdminDashboardTab({ stats, busy, run, onRefresh }: AdminDashboardTabProps) {
  const [generating, setGenerating] = useState(false);
  const [revStats, setRevStats] = useState<adminApi.RevenueStats | null>(null);

  useEffect(() => {
    adminApi.revenueStats().then(setRevStats).catch(() => {});
  }, []);

  const hitRate = stats.tp + stats.sl > 0 ? Math.round((stats.tp / (stats.tp + stats.sl)) * 100) : 0;

  const cards = [
    { label: "Usuários", value: stats.users.toLocaleString("pt-PT"), color: "text-primary", icon: Users },
    { label: "Sinais Hoje", value: stats.total, color: "text-success", icon: TrendingUp },
    { label: "Taxa de Acerto", value: `${hitRate}%`, color: "text-accent", icon: BarChart3 },
    { label: "Premium", value: stats.premium, color: "text-accent", icon: Gem },
    { label: "Expira em Breve", value: stats.expiring, color: "text-warning", icon: Clock },
    { label: "Comprovativos Pendentes", value: stats.pendingReceipts, color: "text-warning", icon: Receipt },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await adminApi.generateCryptoSignals();
      if (result.ok && result.count > 0) {
        toast.success(`Sinais gerados: ${result.count}`);
      } else {
        toast.error(result.error || "Nenhum sinal encontrado agora");
      }
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar sinais");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4 text-center">
            <c.icon className={`mx-auto mb-1 h-5 w-5 ${c.color}`} />
            <p className={`font-display text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      {revStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">Receita (Mês)</p>
            <p className="font-display text-2xl font-bold">${(revStats.thisMonthRevenue.usd ?? 0).toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(revStats.thisMonthRevenue.aoa ?? 0).toLocaleString("pt-PT")} Kz
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">Pagamentos</p>
            <p className="font-display text-2xl font-bold">{revStats.thisMonthCount}</p>
          </div>
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">Levantamentos Pendentes</p>
            <p className="font-display text-2xl font-bold text-warning">
              ${(revStats.pendingWithdrawalsAmount.usd ?? 0).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(revStats.pendingWithdrawalsAmount.aoa ?? 0).toLocaleString("pt-PT")} Kz
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleGenerate} disabled={generating || busy} className="flex-1 min-w-[180px]">
          <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "A gerar..." : "Gerar Sinais"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => run("Sinais fechados", adminApi.closeSignals)}
          disabled={busy}
          className="flex-1 min-w-[180px]"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Fechar TP/SL
        </Button>
      </div>
    </div>
  );
}