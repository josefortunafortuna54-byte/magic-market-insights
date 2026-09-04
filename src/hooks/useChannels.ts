import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToChanges } from "@/lib/realtime";
import { isForexSymbol, isWeekendUtc } from "@/lib/community";
import type { Channel } from "@/lib/types";

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: true });
      if (err) throw err;
      setChannels((data || []) as Channel[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar canais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges("community-channels", [
      { table: "channels", onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  const regular = channels.filter((c) => c.type === "regular");
  const pairRooms = channels.filter(
    (c) => c.type === "pair" && !(isWeekendUtc() && isForexSymbol(c.pair || c.name)),
  );

  return { channels, regular, pairRooms, loading, error, refresh };
}