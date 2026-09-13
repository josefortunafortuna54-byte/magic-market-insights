import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/community/UserAvatar";
import { isUserOnline } from "@/lib/community";
import type { UserProfile } from "@/lib/types";
import type { DmSummary } from "@/hooks/useConversations";

export function DmRow({
  dm,
  profiles,
  index = 0,
  onPress,
  onOpenProfile,
}: {
  dm: DmSummary;
  profiles: Record<string, UserProfile>;
  index?: number;
  onPress: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const profile = profiles[dm.memberId];
  const name = profile?.display_name || t("common.trader");
  const online = isUserOnline(profile);

  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 380, damping: 28 }}
      whileTap={{ scale: 0.99 }}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <UserAvatar
        name={name}
        avatarUrl={profile?.avatar_url || null}
        role={profile?.role}
        size={40}
        online={online}
        onPress={onOpenProfile ? () => onOpenProfile(dm.memberId) : undefined}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-foreground">{name}</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
          />
          <span className={online ? "font-semibold text-emerald-400" : "text-muted-foreground"}>
            {online ? t("workspace.dmOnline") : t("workspace.dmOffline")}
          </span>
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </motion.button>
  );
}