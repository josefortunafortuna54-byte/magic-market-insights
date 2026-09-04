import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToChanges } from "@/lib/realtime";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, ConversationMember } from "@/lib/types";

export interface DmSummary {
  conversationId: string;
  memberId: string;
  createdAt: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [dms, setDms] = useState<DmSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setDms([]);
      setLoading(false);
      return;
    }
    try {
      const { data: my } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .eq("user_id", user.id);
      const rows = (my || []) as ConversationMember[];
      if (rows.length === 0) {
        setDms([]);
        return;
      }
      const ids = rows.map((r) => r.conversation_id);

      const [{ data: members }, { data: convs }] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", ids),
        supabase
          .from("conversations")
          .select("id, created_at")
          .in("id", ids),
      ]);

      const all = (members || []) as ConversationMember[];
      const convMap = new Map(
        ((convs || []) as Conversation[]).map((c) => [c.id, c.created_at]),
      );
      const seen = new Set<string>();

      const list: DmSummary[] = [];
      for (const row of all) {
        if (row.user_id === user.id || seen.has(row.conversation_id)) continue;
        seen.add(row.conversation_id);
        list.push({
          conversationId: row.conversation_id,
          memberId: row.user_id,
          createdAt: convMap.get(row.conversation_id) || "",
        });
      }
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setDms(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const cleanup = subscribeToChanges("community-conversations", [
      { table: "conversation_members", onEvent: () => refresh() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [refresh]);

  return { dms, loading, refresh };
}