import { useEffect, useState } from "react";
import { Leaf, Rocket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBanca } from "@/hooks/useBanca";
import { formatBancaMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "growth_plan";

interface GrowthPlan {
  id: string;
  name: string;
  desc: string;
  returnPct: number;
  months: number;
  icon: "leaf" | "analytics" | "rocket";
  color: string;
}

const PLANS: GrowthPlan[] = [
  { id: "conservador", name: "Conservador", desc: "+25% em 3 meses · Menor risco, consistência", returnPct: 25, months: 3, icon: "leaf", color: "text-success" },
  { id: "equilibrado", name: "Equilibrado", desc: "+20% em 2 meses · Risco moderado", returnPct: 20, months: 2, icon: "analytics", color: "text-accent" },
  { id: "agressivo", name: "Agressivo", desc: "+15% em 1 mês · Retorno mais rápido", returnPct: 15, months: 1, icon: "rocket", color: "text-destructive" },
];

const PLAN_ICONS: Record<GrowthPlan["icon"], typeof Leaf> = {
  leaf: Leaf,
  analytics: TrendingUp,
  rocket: Rocket,
};

export function GrowthPlanSection({ capital, currency = "usd" }: { capital: number; currency?: "usd" | "aoa" }) {
  const { config, save } = useBanca();
  const [selectedId, setSelectedId] = useState(config.planId);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { planId?: string; activated?: boolean };
      if (parsed.planId) setSelectedId(parsed.planId);
      if (parsed.activated) setActivated(true);
    } catch {
      /* ignore */
    }
  }, []);

  const plan = PLANS.find((p) => p.id === selectedId) ?? PLANS[0];
  const projectedReturn = capital * (1 + plan.returnPct / 100);
  const profit = projectedReturn - capital;
  const periodLabel = plan.months === 1 ? `${plan.months} mês` : `${plan.months} meses`;

  const selectPlan = (planId: string) => {
    setSelectedId(planId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId, capital: config.capital, activated }));
    save({ ...config, planId }).catch(() => {});
  };

  const activate = () => {
    setActivated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId: selectedId, capital, activated: true }));
    save({ ...config, planId: selectedId }).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Plano de Crescimento</h2>
        {activated ? (
          <Badge className="bg-success/20 text-success border-success/30">✓ Plano Ativo</Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">Selecione seu plano</p>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const selected = p.id === selectedId;
          const Icon = PLAN_ICONS[p.icon];
          return (
            <button
              key={p.id}
              onClick={() => selectPlan(p.id)}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                selected ? "border-success border-2 bg-success/5" : "border-border/60",
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-secondary", p.color)}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Badge className="bg-secondary text-secondary-foreground border-transparent">+{p.returnPct}%</Badge>
                <span
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 rounded-full border-2",
                    selected ? "border-success bg-success" : "border-muted-foreground/40",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="font-semibold">Projeção</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Investimento</span>
            <span className="font-semibold">{formatBancaMoney(capital, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Retorno Estimado</span>
            <span className="font-semibold text-success">{formatBancaMoney(projectedReturn, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Período</span>
            <span className="font-semibold">{periodLabel}</span>
          </div>
          <div className="rounded-lg bg-success/10 py-2.5 text-center">
            <span className="text-xs font-bold text-success">
              Lucro estimado: +{formatBancaMoney(profit, currency)} USD
            </span>
          </div>
        </CardContent>
      </Card>

      {activated ? (
        <Button variant="secondary" disabled className="w-full">
          ✓ Plano Ativo
        </Button>
      ) : (
        <Button variant="premium" className="w-full" onClick={activate}>
          Ativar Plano
        </Button>
      )}
    </div>
  );
}