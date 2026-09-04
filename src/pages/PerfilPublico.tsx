import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Crown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { BOT_USER_ID, findOrCreateConversation, isUserOnline } from "@/lib/community";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";

export default function PerfilPublico() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);

  const profile = userId ? profiles[userId] : undefined;
  const isOwn = userId === user?.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsPremium(null);
      if (!userId) return;
      try {
        const { data } = await supabase.rpc("is_premium", { uid: userId });
        if (mounted) setIsPremium(data === true);
      } catch {
        if (mounted) setIsPremium(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const openDm = useCallback(async () => {
    if (!user || !userId || profile?.role === "admin") return;
    setStarting(true);
    try {
      const conversationId = await findOrCreateConversation(user.id, userId);
      navigate(`/comunidade/dm/${conversationId}`, { replace: true });
    } catch {
      setStarting(false);
      toast.error("Erro", { description: "Não enviada" });
    }
  }, [user, userId, profile?.role, navigate]);

  if (loading && !profile) {
    return (
      <Layout noFooter>
        <section className="flex items-center justify-center gap-3 py-24">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">A carregar…</p>
        </section>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout noFooter>
        <section className="py-24 text-center">
          <p className="text-sm text-muted-foreground">Utilizador não encontrado</p>
        </section>
      </Layout>
    );
  }

  const canDm = !isOwn && profile.role !== "admin" && profile.user_id !== BOT_USER_ID;
  const online = isUserOnline(profile);

  return (
    <Layout noFooter>
      <section className="pt-6 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
            <UserAvatar
              name={profile.display_name}
              avatarUrl={profile.avatar_url}
              role={profile.role}
              size={84}
            />
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">{profile.display_name}</h1>
              {profile.role === "admin" ? (
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-400">Admin</Badge>
              ) : null}
            </div>

            {online ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Online
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Visto há {timeAgo(profile.last_seen_at || profile.created_at)}
              </span>
            )}

            <span className="text-xs text-muted-foreground">
              Membro desde {new Date(profile.created_at).toLocaleDateString()}
            </span>

            <div className="mt-2">
              {isPremium ? (
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-400">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              ) : (
                <Badge className="border-border bg-muted/50 text-muted-foreground">Plano Grátis</Badge>
              )}
            </div>

            {canDm ? (
              <Button className="mt-3 w-full" onClick={openDm} disabled={starting}>
                {starting ? "A carregar…" : "Enviar mensagem"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}