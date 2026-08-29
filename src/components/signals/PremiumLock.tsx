import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PremiumLockProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function PremiumLock({
  title = "Conteúdo Premium",
  description = "Desbloqueia com os planos Basic, Pro ou Premium",
  compact,
}: PremiumLockProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-accent/30 bg-accent/5 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/30 ${
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      >
        <Lock className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-accent`} />
      </div>
      <div className="flex-1 space-y-1">
        <p className="gradient-text-gold font-bold leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link to="/planos" className="shrink-0">
        <Button variant="premium" size={compact ? "sm" : "default"}>
          Ver Planos
        </Button>
      </Link>
    </div>
  );
}
