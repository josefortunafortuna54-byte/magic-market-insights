import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatClosesIn, pairRoomClosesInMs, pairRoomState } from "@/lib/community";
import type { Channel } from "@/lib/types";

export function PairRoomRow({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = pairRoomState(channel) === "active";
  const closesIn = formatClosesIn(pairRoomClosesInMs(channel));
  const pair = channel.pair || channel.display_name;

  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.99 }}
      className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className={`shrink-0 text-base ${active ? "" : "opacity-45"}`}>🤖</span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{pair}</span>
        <span className={`block truncate text-[11px] ${active ? "text-emerald-400" : "text-muted-foreground"}`}>
          {active ? `#${channel.display_name} · ${closesIn}` : t("workspace.closed")}
        </span>
      </div>
      {active ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
      ) : (
        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
    </motion.button>
  );
}