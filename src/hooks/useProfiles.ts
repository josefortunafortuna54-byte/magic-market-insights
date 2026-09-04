import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToChanges } from "@/lib/realtime";
import type { UserProfile } from "@/lib/types";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.from("user_profiles").select("*");
      const map: Record<string, UserProfile> = {};
      for (const p of (data || []) as UserProfile[]) map[p.user_id] = p;
      setProfiles(map);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges("community-profiles", [
      { table: "user_profiles", onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  return { profiles, loading, refresh };
}