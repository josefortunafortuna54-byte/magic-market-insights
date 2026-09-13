import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Layout } from "@/components/layout/Layout";
import { useChannels } from "@/hooks/useChannels";
import { useConversations } from "@/hooks/useConversations";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { useProfiles } from "@/hooks/useProfiles";
import { timeAgo } from "@/lib/format";
import type { Message } from "@/lib/types";

export default function ComunidadePesquisa() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { results, loading } = useMessageSearch(query);
  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();

  const channelName = useMemo(
    () => new Map(channels.channels.map((c) => [c.id, c.display_name])),
    [channels.channels],
  );
  const dmName = useMemo(() => {
    const map = new Map<string, string>();
    for (const dm of conversations.dms) {
      const name = profiles.profiles[dm.memberId]?.display_name;
      if (name) map.set(dm.conversationId, name);
    }
    return map;
  }, [conversations.dms, profiles.profiles]);

  const open = (m: Message) => {
    if (m.channel_id) navigate(`/comunidade/canais/${m.channel_id}`);
    else if (m.conversation_id) navigate(`/comunidade/dm/${m.conversation_id}`);
  };

  const targetLabel = (m: Message) => {
    if (m.channel_id) return channelName.get(m.channel_id);
    if (m.conversation_id) return dmName.get(m.conversation_id);
    return undefined;
  };

  return (
    <Layout noFooter>
      <section className="pt-6 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("workspace.searchPlaceholder")}
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("workspace.clearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
              <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              {t("workspace.loading")}
            </p>
          ) : query.trim().length === 0 || results.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">{t("workspace.searchEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {results.map((m) => {
                const sender = profiles.profiles[m.user_id]?.display_name;
                const target = targetLabel(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => open(m)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <UserAvatar
                      name={sender || "?"}
                      avatarUrl={profiles.profiles[m.user_id]?.avatar_url}
                      role={profiles.profiles[m.user_id]?.role}
                      size={32}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold">{sender}</span>
                        {target ? <span className="truncate text-xs text-primary">{target}</span> : null}
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(m.created_at)}
                        </span>
                      </div>
                      <p
                        className="text-sm text-muted-foreground"
                        style={{
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {m.text}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}