import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  approveWithdrawal,
  listWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawalWithNotes,
  type WithdrawalRequest,
} from "@/lib/adminApi";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "paid";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Pendente" },
  { key: "approved", label: "Aprovado" },
  { key: "rejected", label: "Rejeitado" },
  { key: "paid", label: "Pago" },
];

const METHOD_ICONS: Record<string, string> = {
  binance: "💰",
  rodotpay: "💳",
  express: "💸",
};

const statusColor = (s: string) =>
  s === "pending" ? "#FF9F0A" : s === "approved" ? "#34C759" : s === "paid" ? "#6366F1" : "#FF453A";
const statusLabel = (s: string) =>
  s === "pending" ? "Pendente" : s === "approved" ? "Aprovado" : s === "paid" ? "Pago" : "Rejeitado";

export function AdminWithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setWithdrawals(await listWithdrawals(undefined, 100));
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Não foi possível carregar levantamentos." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return withdrawals.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!w.method?.toLowerCase().includes(q) && !w.currency?.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [withdrawals, statusFilter, search]);

  const pending = withdrawals.filter((w) => w.status === "pending");
  const approved = withdrawals.filter((w) => w.status === "approved");
  const paid = withdrawals.filter((w) => w.status === "paid");
  const totalVolume = approved.reduce((sum, w) => sum + Number(w.amount), 0);

  const summary = [
    { label: "Pendentes", value: pending.length, color: "#FF9F0A" },
    { label: "Aprovados", value: approved.length, color: "#34C759" },
    { label: "Pagos", value: paid.length, color: "#6366F1" },
    { label: "Volume", value: `$${totalVolume.toFixed(2)}`, color: "#00C853" },
  ];

  const runAction = async (fn: () => Promise<void>, success: string) => {
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Falha na operação." });
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
          placeholder="Pesquisar por método ou moeda..."
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

      {loading ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-muted-foreground">A carregar…</p></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-muted-foreground">Sem pedidos.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => {
            const color = statusColor(w.status);
            return (
              <Card key={w.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {METHOD_ICONS[w.method] || "💸"} {w.method}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {`${w.currency?.toUpperCase() ?? ""} · ${timeAgo(w.created_at)}`}
                        </span>
                      </p>
                    </div>
                    <Badge
                      className="border"
                      style={{ backgroundColor: `${color}20`, borderColor: `${color}40`, color }}
                    >
                      {statusLabel(w.status)}
                    </Badge>
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight">${Number(w.amount).toFixed(2)}</p>
                  {w.details ? <p className="text-xs text-muted-foreground">{w.details}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {w.status === "pending" ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            runAction(() => approveWithdrawal(w.id), "Levantamento aprovado!")
                          }
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            runAction(() => rejectWithdrawalWithNotes(w.id), "Levantamento rejeitado")
                          }
                        >
                          Rejeitar
                        </Button>
                      </>
                    ) : null}
                    {w.status === "approved" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => runAction(() => markWithdrawalPaid(w.id), "Marcado como pago!")}
                      >
                        Marcar Pago
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}