import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BoomMessage } from "@/components/community/BoomMessage";
import { MessageBubble } from "@/components/community/MessageBubble";
import { formatChatDate } from "@/lib/format";
import type { Message, MessageReaction, UserProfile } from "@/lib/types";

type ListItem =
  | { type: "header"; key: string; date: string }
  | { type: "message"; key: string; message: Message };

export function MessageList({
  messages,
  reactions,
  mentionsByMessage,
  profiles,
  currentUserId,
  hasOlder,
  loadingOlder,
  loading = false,
  error,
  onLoadOlder,
  onToggleReaction,
  onRetry,
  onDelete,
  onEdit,
  onReload,
  onOpenProfile,
}: {
  messages: Message[];
  reactions: MessageReaction[];
  mentionsByMessage: Record<string, string[]>;
  profiles: Record<string, UserProfile>;
  currentUserId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadOlder: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, text: string) => void;
  onReload?: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    let lastDay = "";
    for (const m of messages) {
      const day = formatChatDate(m.created_at);
      if (day !== lastDay) {
        out.push({ type: "header", key: `h-${day}`, date: day });
        lastDay = day;
      }
      out.push({ type: "message", key: `m-${m.id}`, message: m });
    }
    return out;
  }, [messages]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom();
  }, [items]);

  if (loading && messages.length === 0 && !error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xl space-y-3 px-2">
          {[0, 1, 2, 3].map((i) => {
            const own = i % 2 === 1;
            return (
              <div key={i} className={`flex items-start gap-2 ${own ? "justify-end" : ""}`}>
                {!own ? <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-secondary" /> : null}
                <div
                  className={`w-[62%] space-y-2 rounded-2xl p-3 ${own ? "w-[55%] bg-card" : "bg-secondary/70"}`}
                >
                  <div className={`h-2.5 rounded bg-background ${own ? "w-[78%] bg-secondary self-end" : "w-[86%]"}`} />
                  <div className="h-2 w-[34%] rounded bg-background opacity-60" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        {error ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{t("workspace.errorTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            {onReload ? (
              <button
                type="button"
                onClick={onReload}
                className="mt-3 rounded-full bg-primary/15 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/25"
              >
                {t("workspace.retry")}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("workspace.noMessages")}</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={() => {
        const el = scrollRef.current;
        if (!el) return;
        const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
        nearBottomRef.current = near;
      }}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pt-3 pb-4">
        {hasOlder ? (
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            {loadingOlder ? t("workspace.loading") : t("workspace.loadOlder")}
          </button>
        ) : null}

        {items.map((item) => {
          if (item.type === "header") {
            return (
              <div key={item.key} className="py-1 text-center">
                <span className="text-[11px] font-bold text-muted-foreground">{item.date}</span>
              </div>
            );
          }
          const m = item.message;
          if (m.boom_id) return <BoomMessage key={item.key} message={m} />;
          const mentionNames = (mentionsByMessage[m.id] || [])
            .map((uid) => profiles[uid]?.display_name)
            .filter((n): n is string => !!n);
          return (
            <MessageBubble
              key={item.key}
              message={m}
              reactions={reactions.filter((r) => r.message_id === m.id)}
              mentionNames={mentionNames}
              profile={profiles[m.user_id]}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
              onRetry={onRetry}
              onDelete={onDelete}
              onEdit={onEdit}
              onOpenProfile={onOpenProfile}
            />
          );
        })}
      </div>
    </div>
  );
}