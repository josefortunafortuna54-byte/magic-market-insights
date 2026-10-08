import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  listCapitalAccounts,
  listCapitalReports,
  postCapitalReport,
  upsertCapitalAccount,
  type AdminCapitalAccount,
  type AdminCapitalReport,
} from "@/lib/adminApi";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CURRENCIES = ["usd", "aoa"] as const;

const money = (v: number, currency: string) =>
  currency === "aoa" ? `${Number(v).toLocaleString("pt-PT")} Kz` : `$${Number(v).toFixed(2)}`;

const statusLabel = (s: string) =>
  s === "inactive" ? "Inativa" : s === "paused" ? "Pausada" : "Ativa";

export function AdminCapitalTab() {
  const [accounts, setAccounts] = useState<AdminCapitalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Partial<AdminCapitalAccount>>>({});
  const [reporting, setReporting] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, AdminCapitalReport[]>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccounts(await listCapitalAccounts());
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Não foi possível carregar as contas de capital." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const totalCapital = accounts.reduce((sum, a) => sum + Number(a.capital), 0);
    const totalAchieved = accounts.reduce((sum, a) => sum + Number(a.achieved), 0);
    const totalWithdrawn = accounts.reduce((sum, a) => sum + Number(a.total_withdrawn), 0);
    const usdAccounts = accounts.filter((a) => a.currency === "usd").length;
    const aoaAccounts = accounts.filter((a) => a.currency === "aoa").length;
    return [
      { label: "Contas", value: accounts.length, color: "#6366F1" },
      { label: "Capital total", value: money(totalCapital, "usd"), color: "#00C853" },
      { label: "Resultado total", value: money(totalAchieved, "usd"), color: "#FF9F0A" },
      { label: "Levantado total", value: money(totalWithdrawn, "usd"), color: "#FF453A" },
      { label: "USD / AOA", value: `${usdAccounts} / ${aoaAccounts}`, color: "#34C759" },
    ];
  }, [accounts]);

  const runAction = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Falha na operação." });
    } finally {
      setBusy(false);
    }
  };

  const setEdit = (userId: string, field: "capital" | "achieved" | "total_withdrawn", value: string) => {
    setEditing((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: parseFloat(value.replace(",", ".")) || 0 },
    }));
  };

  const saveEdit = (acc: AdminCapitalAccount) => {
    const draft = editing[acc.user_id] ?? {};
    const payload = {
      user_id: acc.user_id,
      ...(draft.capital != null ? { capital: draft.capital } : {}),
      ...(draft.achieved != null ? { achieved: draft.achieved } : {}),
      ...(draft.total_withdrawn != null ? { total_withdrawn: draft.total_withdrawn } : {}),
      ...(draft.currency ? { currency: draft.currency } : {}),
    };
    void runAction(async () => upsertCapitalAccount(payload), "Conta atualizada");
    setEditing((prev) => ({ ...prev, [acc.user_id]: {} }));
  };

  const loadReports = async (userId: string) => {
    if (reports[userId]) return;
    try {
      const r = await listCapitalReports(userId);
      setReports((prev) => ({ ...prev, [userId]: r }));
    } catch (e: unknown) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Não foi possível carregar relatórios." });
    }
  };

  const publishReport = async (acc: AdminCapitalAccount, form: HTMLFormElement) => {
    const fd = new FormData(form);
    const periodStart = String(fd.get("period_start") || "");
    const periodEnd = String(fd.get("period_end") || "");
    const start = parseFloat(String(fd.get("starting_balance") || "0"));
    const end = parseFloat(String(fd.get("ending_balance") || "0"));
    if (!periodStart || !periodEnd) {
      toast.error("Período obrigatório", { description: "Indica as datas de início e fim do relatório." });
      return;
    }
    await runAction(
      async () => postCapitalReport({
        user_id: acc.user_id,
        period_start: periodStart,
        period_end: periodEnd,
        starting_balance: start,
        ending_balance: end,
        note: String(fd.get("note") || "") || null,
        currency: acc.currency,
      }),
      "Relatório publicado",
    );
    setReporting(null);
    setReports((prev) => ({ ...prev, [acc.user_id]: [] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">A carregar contas de capital...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-lg font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-0 pt-3">
          {accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma conta de capital registada.
            </p>
          ) : (
            accounts.map((acc, idx) => {
              const draft = editing[acc.user_id] ?? {};
              const latest = reports[acc.user_id]?.[0];
              return (
                <div key={acc.user_id} className={cn("py-3", idx > 0 && "border-t border-border")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{acc.email || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {acc.user_id} · atualizada {acc.updated_at ? formatShortDate(acc.updated_at) : "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{statusLabel(acc.status)}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => { setReporting(reporting === acc.user_id ? null : acc.user_id); if (reporting !== acc.user_id) await loadReports(acc.user_id); }}
                    >
                      Relatório
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">MOEDA</Label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={draft.currency ?? acc.currency}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [acc.user_id]: { ...prev[acc.user_id], currency: e.target.value as "usd" | "aoa" } }))}
                      >
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">CAPITAL</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={Number(acc.capital)}
                        onChange={(e) => setEdit(acc.user_id, "capital", e.target.value)}
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">RESULTADO</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={Number(acc.achieved)}
                        onChange={(e) => setEdit(acc.user_id, "achieved", e.target.value)}
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">LEVANTADO</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={Number(acc.total_withdrawn)}
                        onChange={(e) => setEdit(acc.user_id, "total_withdrawn", e.target.value)}
                        className="mt-1 h-9"
                      />
                    </div>
                    <Button size="sm" disabled={busy || Object.keys(draft).length === 0} onClick={() => saveEdit(acc)}>
                      Guardar
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Capital: <b className="text-foreground">{money(Number(draft.capital ?? acc.capital), acc.currency)}</b></span>
                    <span>Resultado: <b className="text-foreground">{money(Number(draft.achieved ?? acc.achieved), acc.currency)}</b></span>
                    <span>Levantado: <b className="text-foreground">{money(Number(draft.total_withdrawn ?? acc.total_withdrawn), acc.currency)}</b></span>
                  </div>

                  {reporting === acc.user_id ? (
                    <form onSubmit={(e) => { e.preventDefault(); void publishReport(acc, e.currentTarget); }} className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 rounded-xl border border-border bg-secondary/40 p-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">INÍCIO</Label>
                        <Input name="period_start" type="date" className="mt-1 h-9" required />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">FIM</Label>
                        <Input name="period_end" type="date" className="mt-1 h-9" required />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">SALDO INICIAL</Label>
                        <Input name="starting_balance" type="number" step="0.01" className="mt-1 h-9" required />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">SALDO FINAL</Label>
                        <Input name="ending_balance" type="number" step="0.01" className="mt-1 h-9" required />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">NOTA</Label>
                        <Input name="note" className="mt-1 h-9" placeholder="Opcional" />
                      </div>
                      <div className="col-span-2 md:col-span-5 flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={busy}>Publicar relatório</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setReporting(null)}>Cancelar</Button>
                        {latest ? (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Último: {formatShortDate(latest.period_start)} → {formatShortDate(latest.period_end)} · {money(latest.profit, acc.currency)} ({latest.profit_pct}%)
                          </span>
                        ) : null}
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}