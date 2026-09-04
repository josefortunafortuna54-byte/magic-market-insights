import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { countUnreadUserNotifications } from "@/lib/userNotifications";
import { subscribeToChanges } from "@/lib/realtime";

const QUERY_KEY = ["user-notifications-unread"];

/**
 * Conta notificações server-side não lidas (user_notifications.read = false).
 * Atualiza em tempo real via postgres_changes e faz polling de segurança.
 * Usado pelo sino no header.
 */
export function useUnreadUserNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? "anon"],
    queryFn: countUnreadUserNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    return subscribeToChanges("user-notifs-unread", [
      { table: "user_notifications", filter: `user_id=eq.${user.id}`, onEvent: invalidate },
    ]);
  }, [user, queryClient]);

  return { unread: query.data ?? 0 };
}