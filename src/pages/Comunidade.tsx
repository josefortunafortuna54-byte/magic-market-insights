import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Network, Newspaper, Plus, Search, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChannelCard } from "@/components/community/ChannelCard";
import { ChannelPickerModal } from "@/components/community/ChannelPickerModal";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityHero } from "@/components/community/CommunityHero";
import { DmRow } from "@/components/community/DmRow";
import { PairRoomCard } from "@/components/community/PairRoomCard";
import { WorkspaceSection } from "@/components/community/WorkspaceSection";
import { Layout } from "@/components/layout/Layout";
import { useChannels } from "@/hooks/useChannels";
import { useConversations } from "@/hooks/useConversations";
import { useProfiles } from "@/hooks/useProfiles";
import { useQuickCamera } from "@/hooks/useQuickCamera";
import { useSubscription } from "@/hooks/useSubscription";
import { isAdminEmail } from "@/lib/admin";
import { pairRoomState } from "@/lib/community";
import type { Channel } from "@/lib/types";

type Tab = "feed" | "workspace";

function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-1/2 rounded bg-secondary" />
        <div className="h-2.5 rounded bg-secondary" style={{ width }} />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <SkeletonRow key={`a${i}`} width="80%" />
      ))}
      <div className="h-6" />
      {[0, 1].map((i) => (
        <SkeletonRow key={`b${i}`} width="70%" />
      ))}
    </div>
  );
}

export default function Comunidade() {
  const [tab, setTab] = useState<Tab>("workspace");
  const navigate = useNavigate();

  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();
  const { user, isPremium } = useSubscription();
  const camera = useQuickCamera();

  const canCreateChannel = isAdminEmail(user?.email) || isPremium;
  const liveRooms = channels.pairRooms.filter((c) => pairRoomState(c) === "active").length;

  const openChannel = (channel: Channel) => {
    if (channel.is_premium && !isPremium) {
      toast.error("Este canal é Premium.");
      return;
    }
    navigate(`/comunidade/canais/${channel.id}`);
  };

  const openDm = (conversationId: string) => navigate(`/comunidade/dm/${conversationId}`);
  const openProfile = (userId: string) => navigate(`/comunidade/user/${userId}`);

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => navigate("/comunidade/pesquisa")}
              className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40"
            >
              <Search className="h-4 w-4" />
              Pesquisar mensagens.
            </button>
            <input
              ref={camera.fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) camera.onFilePicked(file);
              }}
            />
            <button
              type="button"
              onClick={camera.openCamera}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-amber-400/25 bg-card text-amber-400 transition-colors hover:bg-amber-400/10"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/comunidade/loja")}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-amber-400/25 bg-card text-amber-400 transition-colors hover:bg-amber-400/10"
            >
              <Store className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="mb-4 flex rounded-full border border-border bg-card p-1">
            {(
              [
                ["workspace", Network],
                ["feed", Newspaper],
              ] as [Tab, typeof Network][]
            ).map(([key, Icon]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-all ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {key === "workspace" ? "Workspace" : "Feed"}
                </button>
              );
            })}
          </div>

          {tab === "feed" ? (
            <CommunityFeed />
          ) : (
            <>
              {channels.error ? (
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-destructive/10 p-3">
                  <p className="flex-1 text-sm text-destructive">Erro</p>
                  <button
                    type="button"
                    onClick={channels.refresh}
                    disabled={channels.loading}
                    className="rounded-full bg-destructive/20 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/30 disabled:opacity-50"
                  >
                    Tocar para tentar de novo
                  </button>
                </div>
              ) : null}

              {channels.loading ? (
                <WorkspaceSkeleton />
              ) : (
                <>
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <CommunityHero
                      channelsCount={channels.regular.length + liveRooms}
                      liveRooms={liveRooms}
                    />
                  </motion.div>

                  <WorkspaceSection
                    title="Canais"
                    right={
                      canCreateChannel ? (
                        <button
                          type="button"
                          onClick={() => navigate("/comunidade/novo-canal")}
                          className="text-primary transition-transform hover:scale-105"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      ) : undefined
                    }
                  >
                    {channels.regular.length === 0 ? (
                      <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                        Sem canais disponíveis.
                        <span className="block text-xs mt-1">
                          {canCreateChannel
                            ? "Cria o primeiro canal da comunidade."
                            : "A comunidade está a crescer - volta em breve."}
                        </span>
                      </p>
                    ) : (
                      channels.regular.map((c, i) => (
                        <ChannelCard key={c.id} channel={c} index={i} onPress={() => openChannel(c)} />
                      ))
                    )}
                  </WorkspaceSection>

                  <WorkspaceSection
                    title="Salas de Pares"
                    right={
                      liveRooms > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-extrabold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {liveRooms}
                        </span>
                      ) : undefined
                    }
                  >
                    {channels.pairRooms.length === 0 ? (
                      <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                        Sem salas de pares ativas.
                        <span className="block text-xs mt-1">As salas abrem automaticamente com a sessão de mercado.</span>
                      </p>
                    ) : (
                      channels.pairRooms.map((c, i) => (
                        <PairRoomCard key={c.id} channel={c} index={i} onPress={() => openChannel(c)} />
                      ))
                    )}
                  </WorkspaceSection>

                  <WorkspaceSection
                    title="Mensagens Diretas"
                    right={
                      isPremium ? (
                        <button
                          type="button"
                          onClick={() => navigate("/comunidade/novo-dm")}
                          className="text-primary transition-transform hover:scale-105"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      ) : undefined
                    }
                  >
                    {conversations.loading ? (
                      <div className="space-y-2">
                        {[0, 1].map((i) => (
                          <SkeletonRow key={i} width="75%" />
                        ))}
                      </div>
                    ) : conversations.dms.length === 0 ? (
                      <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                        Sem conversas ainda. Inicia uma nova DM!
                        <span className="block text-xs mt-1">
                          {isPremium
                            ? "Usa o + no topo para iniciares uma conversa."
                            : "Encontra traders na pesquisa para iniciares conversas."}
                        </span>
                      </p>
                    ) : (
                      conversations.dms.map((dm, i) => (
                        <DmRow
                          key={dm.conversationId}
                          dm={dm}
                          profiles={profiles.profiles}
                          index={i}
                          onPress={() => openDm(dm.conversationId)}
                          onOpenProfile={openProfile}
                        />
                      ))
                    )}
                  </WorkspaceSection>
                </>
              )}
            </>
          )}

          <ChannelPickerModal
            visible={camera.pickChannel}
            channels={camera.availableChannels}
            onSelect={camera.sendToChannel}
            onCancel={camera.cancel}
          />
        </div>
      </section>
    </Layout>
  );
}