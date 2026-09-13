import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [revStats, setRevStats] = useState<adminApi.RevenueStats | null>(null);

  useEffect(() => {
    adminApi.revenueStats().then(setRevStats).catch(() => {});
  }, []);

  const hitRate = stats.tp + stats.sl > 0 ? Math.round((stats.tp / (stats.tp + stats.sl)) * 100) : 0;

  const cards: { labelKey: string; value: number | string; color: string; icon: typeof Users }[] = [
    { labelKey: "admin.statUsers", value: stats.users.toLocaleString("pt-PT"), color: "text-primary", icon: Users },
    { labelKey: "admin.statSignalsToday", value: stats.total, color: "text-success", icon: TrendingUp },
    { labelKey: "admin.statWinRate", value: `${hitRate}%`, color: "text-accent", icon: BarChart3 },
    { labelKey: "admin.statPremium", value: stats.premium, color: "text-accent", icon: Gem },
    { labelKey: "admin.statExpiring", value: stats.expiring, color: "text-warning", icon: Clock },
    { labelKey: "admin.statPendingReceipts", value: stats.pendingReceipts, color: "text-warning", icon: Receipt },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await adminApi.generateCryptoSignals();
      if (result.ok && result.count > 0) {
        toast.success(t("admin.doneGenerate", { count: result.count }));
      } else {
        toast.error(result.error || t("admin.noSignalsFound"));
      }
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("adminErrors.generate"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.labelKey} className="glass-card p-4 text-center">
            <c.icon className={`mx-auto mb-1 h-5 w-5 ${c.color}`} />
            <p className={`font-display text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(c.labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      {revStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">{t("admin.revenueMonth")}</p>
            <p className="font-display text-2xl font-bold">${(revStats.thisMonthRevenue.usd ?? 0).toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(revStats.thisMonthRevenue.aoa ?? 0).toLocaleString("pt-PT")} Kz
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">{t("admin.payments")}</p>
            <p className="font-display text-2xl font-bold">{revStats.thisMonthCount}</p>
          </div>
          <div className="glass-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">{t("admin.pendingWithdrawals")}</p>
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
          {generating ? t("admin.generating") : t("admin.generateSignals")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => run(t("admin.doneClose"), adminApi.closeSignals)}
          disabled={busy}
          className="flex-1 min-w-[180px]"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("admin.closeTpSl")}
        </Button>
      </div>
    </div>
  );
}