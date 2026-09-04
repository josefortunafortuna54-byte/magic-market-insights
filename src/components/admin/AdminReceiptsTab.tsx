import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Image,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  approveReceipt,
  deleteReceipt,
  listReceipts,
  rejectReceipt,
  type PaymentReceipt,
} from "@/lib/adminApi";
import { PAYMENT_METHODS, PAYMENT_METHOD_ICONS } from "@/lib/plans";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_FILTERS: { key: StatusFilter; label: string; value: string | null }[] = [
  { key: "pending", label: "Pendente", value: "pending" },
  { key: "approved", label: "Aprovado", value: "approved" },
  { key: "rejected", label: "Rejeitado", value: "rejected" },
];

const statusConfig = (s: string) => {
  if (s === "approved")
    return { color: "#34C759", bg: "rgba(52,199,89,0.12)", border: "rgba(52,199,89,0.3)", label: "Aprovado" };
  if (s === "rejected")
    return { color: "#FF453A", bg: "rgba(255,69,58,0.12)", border: "rgba(255,69,58,0.3)", label: "Rejeitado" };
  return { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.3)", label: "Pendente" };
};

export function AdminReceiptsTab() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReceipts(await listReceipts(undefined, 100));
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Não foi possível carregar comprovativos." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.user_email?.toLowerCase().includes(q) &&
          !r.plan?.toLowerCase().includes(q) &&
          !r.method?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [receipts, statusFilter, search]);

  const pendingCount = receipts.filter((r) => r.status === "pending").length;
  const approvedCount = receipts.filter((r) => r.status === "approved").length;
  const rejectedCount = receipts.filter((r) => r.status === "rejected").length;
  const totalVolume = receipts
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const summary = [
    { label: "Pendentes", value: pendingCount, color: "#FF9F0A" },
    { label: "Aprovados", value: approvedCount, color: "#34C759" },
    { label: "Rejeitados", value: rejectedCount, color: "#FF453A" },
    { label: "Volume", value: totalVolume.toLocaleString("pt-PT"), color: "#6366F1" },
  ];

  const runAction = async (
    id: string,
    fn: () => Promise<void>,
    success: string,
  ) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Falha na operação." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-lg font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por email, plano ou método..."
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>
          Todos
        </Button>
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.key}
            variant="outline"
            size="sm"
            className={cn(statusFilter === f.key && "border-accent bg-accent/15 text-accent")}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Atualizar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} comprovativo{filtered.length !== 1 ? "s" : ""}
        {pendingCount > 0 ? ` · ${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}` : ""}
      </p>

      {loading ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-muted-foreground">A carregar…</p></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-muted-foreground">Sem comprovativos.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const st = statusConfig(r.status);
            const isPending = r.status === "pending";
            const initials = r.user_email?.charAt(0).toUpperCase() ?? "?";
            const methodInfo = PAYMENT_METHODS.find((m) => m.id === r.method);
            const Icon = methodInfo ? PAYMENT_METHOD_ICONS[methodInfo.icon] : undefined;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex overflow-hidden rounded-xl border bg-card",
                  !isPending && "opacity-60",
                )}
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div className="w-1 shrink-0" style={{ backgroundColor: st.color }} />
                <div className="flex-1 space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                      style={{ backgroundColor: `${st.color}20`, color: st.color }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold", !isPending && "text-muted-foreground")}>
                        {r.user_email || r.user_id.slice(0, 12)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.created_at ? timeAgo(r.created_at) : "—"}
                        {r.created_at
                          ? ` · ${new Date(r.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      className="border"
                      style={{ backgroundColor: st.bg, borderColor: st.border, color: st.color }}
                    >
                      {st.label}
                    </Badge>
                  </div>

                  {r.duplicate_of ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                      <Copy className="h-3 w-3" /> Possível duplicado
                    </span>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 rounded-lg border bg-secondary/40 p-3 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground">Plano</span>
                      <span className="ml-auto text-sm font-semibold">{r.plan}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground">Método</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold">
                        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                        {r.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted-foreground">Valor</span>
                      <span className="ml-auto text-sm font-bold text-accent">
                        {r.amount?.toLocaleString("pt-PT")} {r.currency?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {r.proof_url ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(r.proof_url, "_blank")}
                      >
                        <Image className="h-3.5 w-3.5" /> Comprovativo
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : null}

                    {isPending ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === r.id}
                          className="flex-1 md:flex-none border-success/40 bg-success/10 text-success hover:bg-success/20"
                          onClick={() =>
                            runAction(r.id, () => approveReceipt(r.id), "Comprovativo aprovado!")
                          }
                        >
                          <Check className="h-4 w-4" /> Aprovar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === r.id}
                          className="flex-1 md:flex-none border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                          onClick={() =>
                            runAction(r.id, () => rejectReceipt(r.id), "Comprovativo rejeitado")
                          }
                        >
                          <X className="h-4 w-4" /> Rejeitar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() =>
                          runAction(r.id, () => deleteReceipt(r.id), "Comprovativo eliminado")
                        }
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}