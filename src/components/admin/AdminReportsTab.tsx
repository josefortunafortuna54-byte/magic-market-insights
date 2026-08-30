import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FilterChips } from "@/components/admin/FilterChips";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { actOnReport, dismissReport, listReports, type MessageReport } from "@/lib/adminApi";
import { timeAgo } from "@/lib/format";

// Hardcoded on mobile (ReportsPanel.tsx) — there is no admin.* i18n key.
const REASON_LABELS: Record<string, string> = {
  spam: "🚫 Spam",
  harassment: "⚠️ Assédio",
  inappropriate: "🔞 Inadequado",
  other: "❓ Outro",
};

const STATUS_FILTERS = [
  { key: "pending", label: "Pendente", value: "pending" },
  { key: "dismissed", label: "Dispensado", value: "dismissed" },
  { key: "acted", label: "Ação tomada", value: "acted" },
];

export function AdminReportsTab() {
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { activeFilters, toggleFilter, clearFilters, filteredData } = useAdminSearch({
    data: reports as (MessageReport & Record<string, unknown>)[],
    searchFields: ["reason", "details"],
    filterConfig: STATUS_FILTERS,
    filterField: "status",
  });

  const load = useCallback(async () => {
    try {
      setReports(await listReports());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, fn: () => Promise<void>, success: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = (id: string) => {
    if (!window.confirm("Marcar como dispensado?")) return;
    void runAction(id, () => dismissReport(id), "Dispensado");
  };

  // Mobile mostra uma Alert "Ação" com as opções "Apagar mensagem" e
  // "Marcar como visto" — window.confirm é binário, por isso confirmamos
  // cada opção sequencialmente.
  const handleAct = (id: string) => {
    if (window.confirm("Apagar mensagem?")) {
      void runAction(id, () => actOnReport(id, true), "Mensagem apagada");
      return;
    }
    if (window.confirm("Marcar como visto?")) {
      void runAction(id, () => actOnReport(id, false), "Processado");
    }
  };

  const pendingCount = filteredData.filter((r) => r.status === "pending").length;
  const dismissedCount = filteredData.filter((r) => r.status === "dismissed").length;
  const actedCount = filteredData.filter((r) => r.status === "acted").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-lg font-bold" style={{ color: "#FF9F0A" }}>
            {pendingCount}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-lg font-bold">{dismissedCount}</p>
          <p className="text-xs text-muted-foreground">Dispensados</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-lg font-bold" style={{ color: "#34C759" }}>
            {actedCount}
          </p>
          <p className="text-xs text-muted-foreground">Ação tomada</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          filters={STATUS_FILTERS}
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          onClear={clearFilters}
        />
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Atualizar
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">A carregar...</p>
          </CardContent>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">Sem reports</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredData.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{REASON_LABELS[r.reason] || r.reason}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
              </div>
              {r.messages ? (
                <div className="mt-2 rounded-lg border bg-secondary/40 p-3">
                  <p className="line-clamp-3 text-xs italic text-muted-foreground">“{r.messages.text}”</p>
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Reportado por: {r.reporter?.email || "desconhecido"}
              </p>
              {r.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={busyId === r.id}
                    onClick={() => handleAct(r.id)}
                  >
                    Apagar Msg
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    disabled={busyId === r.id}
                    onClick={() => handleDismiss(r.id)}
                  >
                    Dispensar
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {r.status === "acted" ? "✅ Ação tomada" : "⬜ Dispensado"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}