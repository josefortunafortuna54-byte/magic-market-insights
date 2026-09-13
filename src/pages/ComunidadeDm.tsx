import { ChevronLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Composer } from "@/components/community/Composer";
import { MessageList } from "@/components/community/MessageList";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useProfiles } from "@/hooks/useProfiles";

export default function ComunidadeDm() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations();
  const profiles = useProfiles();

  const dm = conversations.dms.find((d) => d.conversationId === conversationId);
  const messages = useMessages({ conversationId: conversationId ?? "" });
  const peer = dm ? profiles.profiles[dm.memberId] : undefined;
  const otherName = peer?.display_name;

  const openProfile = (userId: string) => navigate(`/comunidade/user/${userId}`);

  return (
    <Layout noFooter>
      <section className="flex h-[calc(100vh-5rem)] flex-col">
        <div className="container mx-auto flex min-h-0 flex-1 max-w-2xl flex-col px-0 sm:px-4">
          <header className="flex shrink-0 items-center gap-2 border-b border-border py-3 px-4">
            <button
              type="button"
              onClick={() => navigate("/comunidade")}
              className="rounded-full p-1.5 transition-colors hover:bg-muted/60"
              aria-label={t("common.back")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => dm && openProfile(dm.memberId)}
              className="flex items-center gap-2 transition-transform hover:scale-[0.98]"
            >
              <UserAvatar name={peer?.display_name || "T"} avatarUrl={peer?.avatar_url} size={28} />
              <span className="font-semibold">{otherName || "…"}</span>
            </button>
          </header>

          <MessageList
            messages={messages.messages}
            reactions={messages.reactions}
            mentionsByMessage={messages.mentionsByMessage}
            profiles={profiles.profiles}
            currentUserId={user?.id ?? null}
            hasOlder={messages.hasOlder}
            loadingOlder={messages.loadingOlder}
            loading={messages.loading || (!dm && conversations.loading)}
            error={messages.error}
            onLoadOlder={messages.loadOlder}
            onToggleReaction={messages.toggleReaction}
            onRetry={messages.retry}
            onDelete={(m) => messages.softDelete(m.id)}
            onEdit={messages.edit}
            onReload={messages.refresh}
            onOpenProfile={openProfile}
          />

          <Composer
            onSend={(text, imageUrl, mentionIds) => messages.send(text, imageUrl, mentionIds)}
            profiles={profiles.profiles}
            currentUserId={user?.id ?? null}
          />

          {!dm && !conversations.loading && !messages.loading ? (
            <p className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
              {t("workspace.emptyDms")}
            </p>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}