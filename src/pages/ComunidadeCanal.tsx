import { useState } from "react";
import { ChevronLeft, Hash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Composer } from "@/components/community/Composer";
import { MessageList } from "@/components/community/MessageList";
import { Layout } from "@/components/layout/Layout";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { useAuth } from "@/hooks/useAuth";
import { useChannels } from "@/hooks/useChannels";
import { useMessages } from "@/hooks/useMessages";
import { useProfiles } from "@/hooks/useProfiles";
import { useSubscription } from "@/hooks/useSubscription";
import { consumePendingQuickShare } from "@/hooks/useQuickCamera";

export default function ComunidadeCanal() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const channels = useChannels();
  const profiles = useProfiles();
  const [initialImage] = useState(() => consumePendingQuickShare());

  const channel = channels.regular.find((c) => c.id === channelId);
  const messages = useMessages({ channelId: channelId ?? "" });

  const openProfile = (userId: string) => navigate(`/comunidade/user/${userId}`);

  if (subLoading && !channel) {
    return (
      <Layout noFooter>
        <section className="flex items-center justify-center gap-3 py-24">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </section>
      </Layout>
    );
  }

  if (!subLoading && channel?.is_premium && !isPremium) {
    return (
      <Layout noFooter>
        <section className="pt-8 pb-24">
          <div className="container mx-auto max-w-2xl px-4">
            <button
              type="button"
              onClick={() => navigate("/comunidade")}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <PremiumLock
              title={channel?.display_name || "#"}
              description="Este canal é Premium. Desbloqueia com um plano para participar."
            />
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout noFooter>
      <section className="flex h-[calc(100vh-5rem)] flex-col">
        <div className="container mx-auto flex min-h-0 flex-1 max-w-2xl flex-col px-0 sm:px-4">
          <header className="flex shrink-0 items-center gap-2 border-b border-border py-3 px-4">
            <button
              type="button"
              onClick={() => navigate("/comunidade")}
              className="rounded-full p-1.5 transition-colors hover:bg-muted/60"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{channel?.display_name || "#"}</span>
          </header>

          <MessageList
            messages={messages.messages}
            reactions={messages.reactions}
            mentionsByMessage={messages.mentionsByMessage}
            profiles={profiles.profiles}
            currentUserId={user?.id ?? null}
            hasOlder={messages.hasOlder}
            loadingOlder={messages.loadingOlder}
            loading={messages.loading || (!channel && channels.loading)}
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
            initialImage={initialImage}
          />

          {!channel && !channels.loading && !messages.loading ? (
            <p className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
              Sem canais disponíveis.
            </p>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}