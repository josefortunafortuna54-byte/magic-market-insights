import { motion } from "framer-motion";
import { ChevronRight, Gem, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatClosesIn, pairRoomClosesInMs, pairRoomState } from "@/lib/community";
import type { Channel } from "@/lib/types";

export function PairRoomCard({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 380, damping: 28 }}
      whileTap={{ scale: 0.99 }}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={
          active
            ? { background: "linear-gradient(135deg, rgba(48,209,88,0.20), rgba(22,164,58,0.06))" }
            : { background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))" }
        }
      >
        <span className={`text-[19px] ${active ? "" : "opacity-45"}`}>🤖</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-extrabold text-foreground">{pair}</span>
          {channel.is_premium ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5">
              <Gem className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[9px] font-extrabold tracking-wide text-amber-400">PRO</span>
            </span>
          ) : null}
        </div>

        {active ? (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="text-xs font-extrabold text-emerald-400">AO VIVO</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="truncate text-xs text-muted-foreground">Fecha em {closesIn}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Só leitura</span>
          </div>
        )}
      </div>

      <span
        className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
          active
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        {active ? "Entrar" : "Entrar"}
      </span>
    </motion.button>
  );
}