import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  TrendingDown,
  UserPlus,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AdminNotification, NotificationType } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

interface NotificationListModalProps {
  open: boolean;
  notifications: AdminNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  receipt_pending: FileText,
  receipt_approved: CheckCircle2,
  receipt_rejected: XCircle,
  withdrawal_pending: Wallet,
  signal_closed: TrendingDown,
  signal_tp: CheckCheck,
  signal_sl: X,
  new_user: UserPlus,
  subscription_expired: CreditCard,
  subscription_expiring: Clock,
  system_error: AlertCircle,
};

export function NotificationListModal({
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationListModalProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col p-0">
        <DialogHeader className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle className="font-display text-lg">Notificações</DialogTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={onMarkAllRead}>
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DialogHeader>

        {notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
            <Bell className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sem notificações</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {notifications.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Bell;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onMarkRead(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left",
                    !item.read && "bg-card",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 h-5 w-5 shrink-0", !item.read ? "text-primary" : "text-muted-foreground")}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className={cn("truncate text-sm", !item.read && "font-semibold")}>{item.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
                    <p className="text-xs text-muted-foreground/60">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
