import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  approveManagementRequest,
  createCapitalManagement,
  listCapitalAccounts,
  listCapitalContracts,
  listCapitalReports,
  listManagementRequests,
  listUsers,
  manageCapitalContract,
  postCapitalReport,
  rejectManagementRequest,
  releaseWithdrawalFunds,
  searchCapitalUsers,
  upsertCapitalAccount,
  type AdminCapitalAccount,
  type AdminCapitalContract,
  type AdminCapitalReport,
  type AdminManagementRequest,
  type CapitalContractAction,
  type UserWithSubscription,
} from "@/lib/adminApi";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminCodePrompt } from "@/components/admin/useAdminCodePrompt";
import { Check, RotateCcw, Search, UserPlus, X } from "lucide-react";

const CURRENCIES = ["usd", "aoa"] as const;

const PLAN_MONTHS = { conservador: 3, equilibrado: 2, agressivo: 1 } as const;
type CapitalPlanId = keyof typeof PLAN_MONTHS;
const PLAN_IDS = Object.keys(PLAN_MONTHS) as CapitalPlanId[];

const contractActionLabel: Record<CapitalContractAction, string> = {
  complete: "Concluir",
  cancel: "Cancelar",
  renew: "Renovar",
};

const money = (v: number, currency: string) =>
  currency === "aoa" ? `${Number(v).toLocaleString("pt-PT")} Kz` : `$${Number(v).toFixed(2)}`;

const statusLabel = (s: string) =>
  s === "inactive" ? "Inativa" : s === "paused" ? "Pausada" : "Ativa";

const planLabel = (p: string) =>
  p === "conservador" ? "Conservador" : p === "equilibrado" ? "Equilibrado" : p === "agressivo" ? "Agressivo" : p;

const contractStatusLabel = (s: string) =>
  s === "active" ? "Ativa" : s === "completed" ? "Concluída" : s === "cancelled" ? "Cancelada" : s;

type ContractFilter = "all" | "active" | "completed" | "debt";

const CONTRACT_FILTERS: { id: ContractFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Ativas" },
  { id: "completed", label: "Concluídas" },
  { id: "debt", label: "Dívida (bancas quebradas)" },
];

const daysLeft = (endDate: string) => {
  const ms = new Date(`${endDate}T00:00:00`).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

export function AdminCapitalTab() {
  const [accounts, setAccounts] = useState<AdminCapitalAccount[]>([]);
  const [contracts, setContracts] = useState<AdminCapitalContract[]>([]);
  const [requests, setRequests] = useState<AdminManagementRequest[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Partial<AdminCapitalAccount>>>({});
  const [releaseAmounts, setReleaseAmounts] = useState<Record<string, string>>({});
  const [reporting, setReporting] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, AdminCapitalReport[]>>({});
  const [busy, setBusy] = useState(false);
  const [confirmAdmin, adminPrompt] = useAdminCodePrompt();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserWithSubscription[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [newPlan, setNewPlan] = useState<CapitalPlanId>("equilibrado");
  const [newCurrency, setNewCurrency] = useState<"usd" | "aoa">("usd");
  const [newCapital, setNewCapital] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newMeta, setNewMeta] = useState("");
  const [resetAchieved, setResetAchieved] = useState(false);
  const [contractFilter, setContractFilter] = useState<ContractFilter>("all");

  const load = useCallback(async () => {
    try {
      const [accs, ctr, reqs, userList] = await Promise.all([
        listCapitalAccounts(),
        listCapitalContracts(),
        listManagementRequests("pending"),
        listUsers().catch(() => [] as UserWithSubscription[]),
      ]);
      setAccounts(accs);
      setContracts(ctr.contracts);
      setActiveCount(ctr.activeCount);
      setRequests(reqs);
      setUsers(userList);
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
      { label: "Bancas em gestão", value: activeCount, color: "#8B5CF6" },
      { label: "Capital total", value: money(totalCapital, "usd"), color: "#00C853" },
      { label: "Resultado total", value: money(totalAchieved, "usd"), color: "#FF9F0A" },
      { label: "Levantado total", value: money(totalWithdrawn, "usd"), color: "#FF453A" },
      { label: "USD / AOA", value: `${usdAccounts} / ${aoaAccounts}`, color: "#34C759" },
    ];
  }, [accounts, activeCount]);

  const accountByUser = useMemo(
    () => new Map(accounts.map((a) => [a.user_id, a])),
    [accounts],
  );

  const isDebtContract = useCallback(
    (c: AdminCapitalContract) => {
      const acc = accountByUser.get(c.user_id);
      return acc != null && Number(acc.achieved) < 0;
    },
    [accountByUser],
  );

  const contractFilterCounts = useMemo(
    () => ({
      all: contracts.length,
      active: contracts.filter((c) => c.status === "active").length,
      completed: contracts.filter((c) => c.status === "completed").length,
      debt: contracts.filter(isDebtContract).length,
    }),
    [contracts, isDebtContract],
  );

  const filteredContracts = useMemo(() => {
    switch (contractFilter) {
      case "active":
        return contracts.filter((c) => c.status === "active");
      case "completed":
        return contracts.filter((c) => c.status === "completed");
      case "debt":
        return contracts.filter(isDebtContract);
      default:
        return contracts;
    }
  }, [contracts, contractFilter, isDebtContract]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return [];
    const local = users
      .filter((u) => (u.email ?? "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
      .slice(0, 8);
    return searchResults.length > 0 ? searchResults : local;
  }, [userQuery, users, searchResults]);

  useEffect(() => {
    const q = userQuery.trim();
    if (q.length < 2 || selectedUser) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchCapitalUsers(q);
        if (!cancelled) setSearchResults(result);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userQuery, selectedUser]);

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

  const setEdit = (
    userId: string,
    field: "capital" | "achieved" | "withdrawable_amount" | "total_withdrawn" | "meta_percent",
    value: string,
  ) => {
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
      ...(draft.withdrawable_amount != null ? { withdrawable_amount: draft.withdrawable_amount } : {}),
      ...(draft.total_withdrawn != null ? { total_withdrawn: draft.total_withdrawn } : {}),
      ...(draft.currency ? { currency: draft.currency } : {}),
      ...(draft.meta_percent != null ? { meta_percent: draft.meta_percent } : {}),
    };
    void runAction(async () => upsertCapitalAccount(payload), "Conta atualizada");
    setEditing((prev) => ({ ...prev, [acc.user_id]: {} }));
  };

  const releaseCapital = async (acc: AdminCapitalAccount) => {
    const raw = (releaseAmounts[acc.user_id] ?? "").trim().replace(",", ".");
    const amount = parseFloat(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Valor inválido", { description: "Introduz um valor superior a zero." });
      return;
    }
    const current = Number(acc.withdrawable_amount) || 0;
    const next = current + amount;
    const ok = await confirmAdmin(
      `Disponibilizar ${money(amount, acc.currency)} para levantamento a ${acc.email || "utilizador"}? Limite: ${money(current, acc.currency)} → ${money(next, acc.currency)}.`,
    );
    if (!ok) return;
    await runAction(async () => {
      await releaseWithdrawalFunds({ user_id: acc.user_id, amount, currency: acc.currency });
      setReleaseAmounts((prev) => ({ ...prev, [acc.user_id]: "" }));
    }, "Valor disponibilizado para levantamento");
  };

  const addToManagement = async () => {
    if (!selectedUser) {
      toast.error("Escolhe um utilizador", { description: "Pesquisa pelo email e seleciona o utilizador." });
      return;
    }
    const capital = newCapital.trim() === "" ? null : parseFloat(newCapital.replace(",", "."));
    if (capital != null && (!Number.isFinite(capital) || capital < 0)) {
      toast.error("Capital inválido", { description: "Introduz um valor igual ou superior a zero." });
      return;
    }
    const meta = newMeta.trim() === "" ? null : parseFloat(newMeta.replace(",", "."));
    if (meta != null && (!Number.isFinite(meta) || meta < 0 || meta > 100)) {
      toast.error("Meta inválida", { description: "A meta deve estar entre 0% e 100%." });
      return;
    }

    const months = PLAN_MONTHS[newPlan];
    const ok = await confirmAdmin(
      `Adicionar ${selectedUser.email || "utilizador"} à gestão (${planLabel(newPlan)}, ${months} mês(es))?`,
    );
    if (!ok) return;

    await runAction(async () => {
      await createCapitalManagement({
        user_id: selectedUser.id,
        plan_id: newPlan,
        currency: newCurrency,
        ...(capital != null ? { capital } : {}),
        ...(newStart ? { start_date: newStart } : {}),
        ...(meta != null ? { meta_percent: meta } : {}),
        reset_achieved: resetAchieved,
      });
      setSelectedUser(null);
      setUserQuery("");
      setNewCapital("");
      setNewStart("");
      setNewMeta("");
      setResetAchieved(false);
    }, "Utilizador adicionado à gestão");
  };

  const manageContract = async (contract: AdminCapitalContract, op: CapitalContractAction) => {
    const ok = await confirmAdmin(
      `${contractActionLabel[op]} a gestão de ${contract.email || "utilizador"} (${planLabel(contract.plan_id)})?`,
    );
    if (!ok) return;
    await runAction(async () => { await manageCapitalContract(contract.id, op); }, `Contrato: ${contractActionLabel[op].toLowerCase()}`);
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
        <CardContent className="space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Adicionar utilizador à gestão</h3>
          </div>

          {selectedUser ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{selectedUser.email || selectedUser.id}</p>
                <p className="truncate text-xs text-muted-foreground">{selectedUser.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} aria-label="Remover utilizador">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Pesquisar utilizador por email ou ID..."
                  className="pl-9"
                />
              </div>
              {userQuery.trim() ? (
                <div className="mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-card shadow-sm">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      {searching ? "A pesquisar..." : "Nenhum utilizador encontrado."}
                    </p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserQuery("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        <span className="min-w-0 flex-1 truncate">{u.email || u.id}</span>
                        {u.role ? <Badge variant="secondary">{u.role}</Badge> : null}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Escreve o email para encontrar o utilizador e adicioná-lo manualmente à gestão de banca.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-5">
            <div>
              <Label className="text-[10px] text-muted-foreground">PLANO</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as CapitalPlanId)}
              >
                {PLAN_IDS.map((p) => (
                  <option key={p} value={p}>{planLabel(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">MOEDA</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value as "usd" | "aoa")}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">CAPITAL</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newCapital}
                onChange={(e) => setNewCapital(e.target.value)}
                placeholder="Opcional"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">META %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={newMeta}
                onChange={(e) => setNewMeta(e.target.value)}
                placeholder="Opcional"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">INÍCIO</Label>
              <Input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={resetAchieved}
                onChange={(e) => setResetAchieved(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Reiniciar resultado para o capital indicado
            </label>
            <span className="text-xs text-muted-foreground">
              Prazo: {PLAN_MONTHS[newPlan]} mês(es)
            </span>
            <Button className="ml-auto" onClick={() => void addToManagement()} disabled={busy || !selectedUser}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Adicionar à gestão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pedidos de gerenciamento</h3>
            <span className="text-xs text-muted-foreground">{requests.length} pendente(s)</span>
          </div>
          {requests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem pedidos de gerenciamento.</p>
          ) : (
            requests.map((r, idx) => (
              <div
                key={r.id}
                className={cn("flex flex-wrap items-center gap-3 py-2 text-sm", idx > 0 && "border-t border-border")}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {planLabel(r.plan_id)} · {formatShortDate(r.created_at)}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await confirmAdmin(
                      `Aprovar o pedido de gerenciamento de ${r.email || "utilizador"} (${planLabel(r.plan_id)})?`,
                    );
                    if (!ok) return;
                    await runAction(() => approveManagementRequest(r.id), "Pedido aprovado");
                  }}
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void runAction(() => rejectManagementRequest(r.id), "Pedido recusado")}
                >
                  Rejeitar
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Bancas em gestão</h3>
            <span className="text-xs text-muted-foreground">
              {activeCount} ativa(s) · {filteredContracts.length} de {contracts.length} mostrada(s)
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            {CONTRACT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setContractFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  contractFilter === f.id
                    ? f.id === "debt"
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label} · {contractFilterCounts[f.id]}
              </button>
            ))}
          </div>
          {contracts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma banca em gestão.</p>
          ) : filteredContracts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma banca neste filtro.</p>
          ) : (
            filteredContracts.map((c, idx) => (
              <div
                key={c.id}
                className={cn("flex flex-wrap items-center gap-3 py-2 text-sm", idx > 0 && "border-t border-border")}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {planLabel(c.plan_id)} · {money(Number(c.capital_inicial), c.currency)} ·{" "}
                    {formatShortDate(c.start_date)} → {formatShortDate(c.end_date)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.status === "active" ? `${daysLeft(c.end_date)} dia(s) restantes · ` : ""}
                  penalidade {Number(c.penalty_pct)}%
                </span>
                <Badge variant={c.status === "active" ? "default" : "secondary"}>
                  {contractStatusLabel(c.status)}
                </Badge>
                {(() => {
                  const acc = accountByUser.get(c.user_id);
                  const achieved = acc ? Number(acc.achieved) : 0;
                  return acc && achieved < 0 ? (
                    <Badge variant="destructive">
                      Dívida {money(Math.abs(achieved), acc.currency)}
                    </Badge>
                  ) : null;
                })()}
                {c.status === "active" ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void manageContract(c, "renew")}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Renovar
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void manageContract(c, "complete")}>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => void manageContract(c, "cancel")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void manageContract(c, "renew")}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reativar
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

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

                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-secondary/30 p-2">
                    <div className="min-w-[140px] flex-1">
                      <Label className="text-[10px] text-muted-foreground">DISPONIBILIZAR</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={releaseAmounts[acc.user_id] ?? ""}
                        onChange={(e) => setReleaseAmounts((prev) => ({ ...prev, [acc.user_id]: e.target.value }))}
                        placeholder="Valor a creditar"
                        className="mt-1 h-9"
                      />
                    </div>
                    <Button size="sm" disabled={busy} onClick={() => void releaseCapital(acc)}>
                      Disponibilizar
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
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
                    <div>
                      <Label className="text-[10px] text-muted-foreground">META %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        defaultValue={acc.meta_percent != null ? Number(acc.meta_percent) : ""}
                        onChange={(e) => setEdit(acc.user_id, "meta_percent", e.target.value)}
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
                    <span>
                      Meta: <b className="text-foreground">
                        {draft.meta_percent != null
                          ? `${Number(draft.meta_percent)}%`
                          : acc.meta_percent != null
                            ? `${Number(acc.meta_percent)}%`
                            : "—"}
                      </b>
                    </span>
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

      {adminPrompt}
    </div>
  );
}