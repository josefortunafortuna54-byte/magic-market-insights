import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import type { Channel } from "@/lib/types";

export function ChannelRow({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 380, damping: 28 }}
      whileTap={{ scale: 0.99 }}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <Tag className="h-4 w-4 text-primary" />
      </div>
      <span className="truncate text-sm font-semibold text-foreground">{channel.display_name}</span>
    </motion.button>
  );
}