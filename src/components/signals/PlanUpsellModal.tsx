import { Zap, Rocket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, PRICES, planLabel } from "@/lib/plans";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<string, typeof Zap> = {
  flash: Zap,
  rocket: Rocket,
  trophy: Trophy,
};

export function PlanUpsellModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { currency, tier } = useSubscription();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="gradient-text-gold text-2xl">
            Desbloqueie o Premium
          </DialogTitle>
          <DialogDescription>
            Escolha um plano e desbloqueie todas as análises e sinais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {PLANS.map((plan) => {
            const Icon = PLAN_ICONS[plan.icon] ?? Zap;
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors",
                  plan.highlight && "border-primary/40 bg-primary/5",
                  plan.featured &&
                    "border-amber-400/40 bg-amber-400/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]",
                  !plan.highlight && !plan.featured && "border-border/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border",
                      plan.featured
                        ? "border-amber-400/40 bg-amber-400/15 text-amber-400"
                        : "border-primary/30 bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {planLabel(plan.id)}
                      {plan.featured && (
                        <Badge className="ml-2 badge-premium">Premium</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {PRICES[currency][plan.id]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link to="/planos" className="w-full">
            <Button variant="premium" className="w-full" onClick={() => onOpenChange(false)}>
              Subscrever
            </Button>
          </Link>
          {tier !== "free" && (
            <p className="text-center text-xs text-muted-foreground">
              Já tens Premium?
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
