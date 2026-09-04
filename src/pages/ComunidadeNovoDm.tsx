import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DmRow } from "@/components/community/DmRow";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { findOrCreateConversation } from "@/lib/community";

export default function ComunidadeNovoDm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();

  const candidates = Object.values(profiles).filter(
    (p) => p.user_id !== user?.id && p.role !== "admin",
  );

  const startDm = async (memberId: string) => {
    if (!user) return;
    try {
      const conversationId = await findOrCreateConversation(user.id, memberId);
      navigate(`/comunidade/dm/${conversationId}`, { replace: true });
    } catch {
      toast.error("Erro", { description: "Não enviada" });
    }
  };

  return (
    <Layout noFooter>
      <section className="pt-8 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="mb-3 font-display text-xl font-bold">Nova mensagem</h1>

          {loading ? (
            <p className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
              <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              A carregar…
            </p>
          ) : candidates.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">
              Sem utilizadores disponíveis.
            </p>
          ) : (
            <div className="space-y-2">
              {candidates.map((p, i) => (
                <DmRow
                  key={p.user_id}
                  dm={{ conversationId: p.user_id, memberId: p.user_id, createdAt: "" }}
                  profiles={profiles}
                  index={i}
                  onPress={() => startDm(p.user_id)}
                  onOpenProfile={(id) => navigate(`/comunidade/user/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}