import { useState } from "react";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Fingerprint,
  ShieldCheck,
  User as UserIcon,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserWithSubscription } from "@/lib/adminApi";

interface UserDetailModalProps {
  user: UserWithSubscription | null;
  open: boolean;
  onClose: () => void;
  onBan: (userId: string) => Promise<void>;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onExpiryChange: (userId: string, expiresAt: string | null) => Promise<void>;
}

const EXPIRY_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "365 dias", days: 365 },
];

export function UserDetailModal({
  user,
  open,
  onClose,
  onBan,
  onRoleChange,
  onExpiryChange,
}: UserDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState<number | null>(null);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg" />
      </Dialog>
    );
  }

  const isBanned = user.banned === true;
  const role = user.role ?? "free";
  const initials = user.email?.charAt(0).toUpperCase() ?? "?";
  const avatarColor = isBanned ? "bg-destructive" : role === "premium" ? "bg-accent" : "bg-primary";

  const memberSince = new Date(user.created_at).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const lastSeen = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      new Date(user.last_sign_in_at).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Nunca";

  const daysUntilExpiry = user.subscription_expires
    ? Math.ceil((new Date(user.subscription_expires).getTime() - Date.now()) / 86400000)
    : null;

  const run = async (fn: () => Promise<void>, successMsg?: string, closeAfter = true) => {
    setLoading(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      if (closeAfter) onClose();
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Ocorreu um erro." });
    } finally {
      setLoading(false);
    }
  };

  const handleBan = () => {
    const ok = window.confirm(
      isBanned
        ? `Desbanir utilizador?\nO utilizador ${user.email} terá acesso restaurado.`
        : `Banir utilizador?\nO utilizador ${user.email} será banido e perderá acesso ao app.`,
    );
    if (!ok) return;
    void run(
      () => onBan(user.id),
      isBanned ? "Utilizador desbanido com sucesso" : "Utilizador banido com sucesso",
    );
  };

  const handleRoleChange = (newRole: string) => {
    if (newRole === role) return;
    if (!window.confirm(`Alterar para ${newRole}?\nO plano do utilizador será alterado de ${role} para ${newRole}.`)) return;
    void run(() => onRoleChange(user.id, newRole), "Função do utilizador atualizada");
  };

  const handleSetExpiry = (days: number | null) => {
    if (days === null) {
      if (!window.confirm("Definir expiração?\nA subscrição não expirará mais.")) return;
    } else {
      if (!window.confirm(`Definir expiração?\nA subscrição expirará em ${days} dias.`)) return;
    }
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    void run(() => onExpiryChange(user.id, expiresAt), "Expiração da subscrição atualizada");
  };

  const expiryTextColor =
    daysUntilExpiry !== null && daysUntilExpiry < 7 ? "text-destructive font-bold" : "text-foreground";
  const expiryDotColor =
    daysUntilExpiry !== null && daysUntilExpiry < 7
      ? "bg-destructive"
      : daysUntilExpiry !== null && daysUntilExpiry < 30
        ? "bg-warning"
        : "bg-success";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="text-sm font-medium text-muted-foreground">Detalhes do Utilizador</DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Hero */}
        <div className="flex flex-col items-center border-b border-border px-4 pb-6 pt-2 text-center">
          <div className={cn("mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold text-white", avatarColor)}>
            {initials}
          </div>
          <h3 className="mb-2 max-w-full truncate text-lg font-bold">{user.email}</h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold",
                role === "premium"
                  ? "border-accent/30 bg-accent/15 text-accent"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {role === "premium" ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
              {role.toUpperCase()}
            </span>
            {isBanned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
                <Ban className="h-3 w-3" /> BANIDO
              </span>
            )}
            {user.subscription_status && (
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                {user.subscription_status}
              </span>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="px-4 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalhes do Utilizador</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Data de registo
              </span>
              <span className="text-sm">{memberSince}</span>
            </div>
            <div className="ml-4 h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Último acesso
              </span>
              <span className="flex items-center gap-1 text-sm">
                <span className={cn("h-1.5 w-1.5 rounded-full", user.last_sign_in_at ? "bg-success" : "bg-muted-foreground/50")} />
                {lastSeen}
              </span>
            </div>
            <div className="ml-4 h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Subscrição expira em
              </span>
              <span className="flex items-center gap-1 text-sm">
                {user.subscription_expires ? (
                  <>
                    <span className={cn("h-1.5 w-1.5 rounded-full", expiryDotColor)} />
                    <span className={expiryTextColor}>
                      {new Date(user.subscription_expires).toLocaleDateString("pt-PT")}
                      {daysUntilExpiry !== null && (
                        <span className="font-normal text-muted-foreground"> ({daysUntilExpiry} dias)</span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Nunca</span>
                )}
              </span>
            </div>
            <div className="ml-4 h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Fingerprint className="h-4 w-4" /> ID
              </span>
              <span className="font-mono text-xs text-muted-foreground">{user.id.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        {/* Plan & Subscription */}
        <div className="px-4 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano & Subscrição</p>
          <div className="grid grid-cols-2 gap-3">
            <PlanCard
              option={{ value: "free", label: "Free" }}
              role={role}
              Icon={UserIcon}
              iconColor="text-muted-foreground"
              disabled={loading || role === "free"}
              onSelect={handleRoleChange}
            />
            <PlanCard
              option={{ value: "premium", label: "Premium" }}
              role={role}
              Icon={ShieldCheck}
              iconColor="text-accent"
              disabled={loading || role === "premium"}
              onSelect={handleRoleChange}
            />
          </div>

          <p className="mb-2 mt-4 text-sm text-muted-foreground">Expiração da subscrição</p>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setSelectedExpiryDays(p.days)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  selectedExpiryDays === p.days
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedExpiryDays(null)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                selectedExpiryDays === null
                  ? "border-destructive bg-destructive text-white"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              Sem limite
            </button>
          </div>

          {selectedExpiryDays !== null ? (
            <Button
              variant="premium"
              className="mt-3 w-full"
              disabled={loading}
              onClick={() => handleSetExpiry(selectedExpiryDays)}
            >
              Definir expiração: {selectedExpiryDays} dias
            </Button>
          ) : (
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={loading}
              onClick={() => handleSetExpiry(null)}
            >
              Remover expiração
            </Button>
          )}
        </div>

        {/* Danger zone */}
        <div className="px-4 pb-4 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">Zona de Perigo</p>
          <button
            type="button"
            disabled={loading}
            onClick={handleBan}
            className="flex w-full items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-left transition-colors hover:bg-destructive/15 disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              {isBanned ? <Check className="h-5 w-5 text-success" /> : <UserX className="h-5 w-5 text-destructive" />}
              <span>
                <span className={cn("block text-sm font-semibold", isBanned ? "text-success" : "text-destructive")}>
                  {isBanned ? "Remover Ban" : "Banir Utilizador"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isBanned ? "Restaurar acesso ao app" : "Bloquear acesso ao app"}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  option,
  role,
  Icon,
  iconColor,
  disabled,
  onSelect,
}: {
  option: { value: string; label: string };
  role: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  const active = option.value === role;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option.value)}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 bg-card p-4 transition-colors",
        active ? cn("border-current", iconColor, "bg-primary/15") : "border-border opacity-60 hover:opacity-100",
      )}
    >
      <Icon className="h-6 w-6" />
      <span className={cn("text-sm font-semibold", iconColor)}>{option.label}</span>
      {active && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
