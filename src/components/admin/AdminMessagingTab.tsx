import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listUsers, sendDm, sendPush } from "@/lib/adminApi";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { SearchBar } from "@/components/admin/SearchBar";
import { cn } from "@/lib/utils";

type Tab = "dm" | "push";
type PushTarget = "all" | "premium" | "free";

// Local type alias (structurally mirrors UserWithSubscription) — type aliases get
// implicit index signatures, which the useAdminSearch Record<string, unknown>
// constraint requires (interfaces do not).
type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role?: string;
  subscription_status?: string;
  subscription_expires?: string;
  banned?: boolean;
};

const TARGETS: { key: PushTarget; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "premium", label: "Premium" },
  { key: "free", label: "Free" },
];

export function AdminMessagingTab() {
  const [tab, setTab] = useState<Tab>("dm");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dmUserId, setDmUserId] = useState("");
  const [dmText, setDmText] = useState("");
  const [dmSending, setDmSending] = useState(false);

  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushTarget, setPushTarget] = useState<PushTarget>("all");
  const [pushSending, setPushSending] = useState(false);

  const { searchQuery, setSearchQuery, filteredData } = useAdminSearch({
    data: users,
    searchFields: ["email"],
  });

  useEffect(() => {
    listUsers()
      .then((u) => {
        setUsers(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSendDm = async () => {
    if (!dmUserId || !dmText.trim()) {
      toast.error("Seleciona um utilizador e escreve a mensagem");
      return;
    }
    setDmSending(true);
    try {
      const result = await sendDm(dmUserId, dmText);
      toast.success(`DM enviada! ${result.notified} notificações`);
      setDmText("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setDmSending(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast.error("Preenche título e mensagem");
      return;
    }
    setPushSending(true);
    try {
      let userIds: string[] | null = null;
      if (pushTarget !== "all") {
        const isPremium = pushTarget === "premium";
        userIds = users
          .filter((u) => {
            const sub = u.subscription_status;
            const hasPaid = sub === "active" || sub === "premium" || sub === "basic" || sub === "pro";
            return isPremium ? hasPaid : !hasPaid;
          })
          .map((u) => u.id);
      }
      const result = await sendPush(userIds, pushTitle, pushMessage);
      toast.success(`Push enviado! ${result.notified} notificações para ${result.target_users} utilizadores`);
      setPushTitle("");
      setPushMessage("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setPushSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("dm")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-all",
            tab === "dm" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70",
          )}
        >
          DM Direta
        </button>
        <button
          type="button"
          onClick={() => setTab("push")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-all",
            tab === "push" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70",
          )}
        >
          Push Broadcast
        </button>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar utilizador..." />

      {tab === "dm" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-semibold">Enviar DM como TMT Bot</p>
              {dmUserId && users.find((u) => u.id === dmUserId) ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-primary">
                    {users.find((u) => u.id === dmUserId)?.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDmUserId("")}
                    className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Remover seleção"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              <Textarea value={dmText} onChange={(e) => setDmText(e.target.value)} placeholder="Mensagem..." rows={3} />
              <Button onClick={() => void handleSendDm()} disabled={dmSending || !dmUserId || !dmText.trim()}>
                {dmSending ? "A enviar..." : "Enviar DM"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">Utilizadores ({filteredData.length})</p>

          {loading ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">A carregar…</p>
              </CardContent>
            </Card>
          ) : filteredData.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">Sem utilizadores.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border bg-card">
              {filteredData.map((u) => {
                const isSelected = dmUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setDmUserId(u.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-secondary/40",
                      isSelected && "bg-primary/10",
                    )}
                  >
                    <span className={cn("min-w-0 truncate", isSelected ? "font-semibold text-primary" : "text-foreground")}>
                      {u.email}
                    </span>
                    {u.subscription_status === "active" ? <span className="shrink-0 text-sm">⭐</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-semibold">Enviar Push Notification</p>
            <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Título" />
            <Textarea value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} placeholder="Mensagem" />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Enviar para:</p>
              <div className="grid grid-cols-3 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPushTarget(t.key)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      pushTarget === t.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => void handleSendPush()}
              disabled={pushSending || !pushTitle.trim() || !pushMessage.trim()}
            >
              {pushSending ? "A enviar..." : "Enviar Push"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}