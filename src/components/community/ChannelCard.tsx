import { motion } from "framer-motion";
import { ChevronRight, Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { channelIcon, tileFor } from "@/components/community/channel-meta";
import type { Channel } from "@/lib/types";

export function ChannelCard({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const Icon = channelIcon(channel.icon);
  const letter = (channel.display_name.trim().charAt(0) || "#").toUpperCase();
  const [from, to] = tileFor(channel.name);

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
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {Icon ? (
          <Icon className="h-5 w-5 text-foreground" />
        ) : (
          <span className="text-[17px] font-extrabold text-foreground">{letter}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-foreground">
            {channel.display_name}
          </span>
          {channel.is_premium ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5">
              <Gem className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[9px] font-extrabold tracking-wide text-amber-400">PRO</span>
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {channel.description || t("workspace.channelNoDesc")}
        </p>
      </div>

      <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground", "group-hover:text-foreground")} />
    </motion.button>
  );
}