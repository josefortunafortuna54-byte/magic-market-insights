import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

export function NotificationBadge({ count, onPress }: NotificationBadgeProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onPress}
      className="relative"
      aria-label="Notificações"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
