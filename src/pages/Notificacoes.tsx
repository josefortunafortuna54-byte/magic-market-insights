import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, Bell, BellOff, Flame, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  clearUserNotifications,
  deleteUserNotification,
  getNotifications,
  markAllUserNotificationsRead,
  NOTIFICATIONS_LIMIT,
  type UserNotification,
} from "@/lib/userNotifications";
import {
  clearPlanRequests,
  getPlanRequests,
  pruneExpiredPlanRequests,
  removePlanRequest,
  type PlanRequestEntry,
} from "@/lib/planRequests";

interface NotifItem {
  identifier: string;
  title: string;
  body: string;
  fireAt: Date | null;
  createdAt?: Date;
  kind: "boom" | "plan" | "signal" | "other";
  source: "remote" | "plan-request" | "local";
  unread: boolean;
}

type Group = "today" | "week" | "earlier";

function kindOf(item: { title: string | null; kind?: string }): NotifItem["kind"] {
  if (item.kind === "plan") return "plan";
  if (!item.title) return "other";
  if (/boom|alarme/i.test(item.title)) return "boom";
  if (/premium|plano|oferta|pedido/i.test(item.title)) return "plan";
  if (/sinal|signal|\btp\b|\bsl\b/i.test(item.title)) return "signal";
  return "other";
}

function itemDate(item: NotifItem): Date {
  return item.createdAt ?? item.fireAt ?? new Date(0);
}

function groupOf(item: NotifItem): Group {
  const d = itemDate(item);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d >= startOfToday) return "today";
  const weekAgo = startOfToday.getTime() - 6 * 86_400_000;
  if (d.getTime() >= weekAgo) return "week";
  return "earlier";
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Agora mesmo";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

function formatFire(fireAt: Date | null): string {
  if (!fireAt) return "Em breve";
  const diff = fireAt.getTime() - Date.now();
  if (diff <= 0) return "Entregue";
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `Em ${mins} min`;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `Em ${hh}h${mm}min`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const KIND_STYLE: Record<
  NotifItem["kind"],
  { icon: ComponentType<{ className?: string }>; text: string; bg: string; border: string }
> = {
  boom: { icon: Flame, text: "text-accent", bg: "bg-accent/10", border: "border-accent/40" },
  signal: { icon: Zap, text: "text-success", bg: "bg-success/10", border: "border-success/40" },
  plan: { icon: Sparkles, text: "text-primary", bg: "bg-primary/10", border: "border-primary/40" },
  other: { icon: Bell, text: "text-muted-foreground", bg: "bg-muted/40", border: "border-border" },
};

const GROUP_LABEL: Record<Group, string> = {
  today: "Hoje",
  week: "Esta semana",
  earlier: "Anteriores",
};

const GROUP_ORDER: Group[] = ["today", "week", "earlier"];

export default function Notificacoes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toNotifItems = useCallback(
    (remote: UserNotification[], planRequests: PlanRequestEntry[]): NotifItem[] => {
      const planItems: NotifItem[] = planRequests.map((p) => ({
        identifier: p.id,
        title: p.title,
        body: p.body,
        fireAt: null,
        createdAt: new Date(p.createdAt),
        kind: "plan",
        source: "plan-request",
        unread: false,
      }));
      const remoteItems: NotifItem[] = remote.map((n) => ({
        identifier: n.id,
        title: n.title,
        body: n.body,
        fireAt: null,
        createdAt: new Date(n.created_at),
        kind: kindOf({ title: n.title, kind: n.kind }),
        source: "remote",
        unread: !n.read,
      }));
      return [...remoteItems, ...planItems].sort(
        (a, b) => (b.createdAt?.getTime() ?? b.fireAt?.getTime() ?? Infinity) -
          (a.createdAt?.getTime() ?? a.fireAt?.getTime() ?? Infinity),
      );
    },
    [],
  );

  const load = useCallback(async (): Promise<{ items: NotifItem[]; hasMore: boolean }> => {
    await pruneExpiredPlanRequests().catch(() => {});
    const [planRequests, remote] = await Promise.all([
      getPlanRequests().catch(() => [] as PlanRequestEntry[]),
      getNotifications(0, NOTIFICATIONS_LIMIT).catch(() => []),
    ]);
    return {
      items: toNotifItems(remote, planRequests),
      hasMore: remote.length === NOTIFICATIONS_LIMIT,
    };
  }, [toNotifItems]);

  useEffect(() => {
    load().then(({ items: next, hasMore: more }) => {
      setItems(next);
      setHasMore(more);
      setPage(0);
    });
    // O sino conta como lido ao abrir a caixa de entrada — mas com um
    // pequeno delay para os pontos "por ler" ficarem visíveis.
    markReadTimer.current = setTimeout(() => {
      markAllUserNotificationsRead().catch(() => {});
      setItems((prev) =>
        prev ? prev.map((i) => (i.source === "remote" ? { ...i, unread: false } : i)) : prev,
      );
    }, 2500);
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { items: next, hasMore: more } = await load();
      setItems(next);
      setHasMore(more);
      setPage(0);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    const next = page + 1;
    const remote = await getNotifications(next, NOTIFICATIONS_LIMIT).catch(() => []);
    setItems((prev) => {
      if (!prev) return prev;
      const existing = new Set(prev.map((i) => i.identifier));
      const remoteItems: NotifItem[] = remote
        .filter((n) => !existing.has(n.id))
        .map((n) => ({
          identifier: n.id,
          title: n.title,
          body: n.body,
          fireAt: null,
          createdAt: new Date(n.created_at),
          kind: kindOf({ title: n.title, kind: n.kind }),
          source: "remote",
          unread: !n.read,
        }));
      return [...prev, ...remoteItems].sort(
        (a, b) => (b.createdAt?.getTime() ?? b.fireAt?.getTime() ?? Infinity) -
          (a.createdAt?.getTime() ?? a.fireAt?.getTime() ?? Infinity),
      );
    });
    setPage(next);
    setHasMore(remote.length === NOTIFICATIONS_LIMIT);
  }, [page]);

  const remove = useCallback(
    async (identifier: string) => {
      setBusyId(identifier);
      try {
        const item = items?.find((i) => i.identifier === identifier);
        if (item?.source === "remote") {
          await deleteUserNotification(identifier).catch(() => {});
        } else if (identifier.startsWith("plan-request-")) {
          await removePlanRequest(identifier);
        }
        const { items: next, hasMore: more } = await load();
        setItems(next);
        setHasMore(more);
        setPage(0);
      } finally {
        setBusyId(null);
      }
    },
    [items, load],
  );

  const clearAll = useCallback(async () => {
    setBusyId("all");
    try {
      await Promise.all([
        clearPlanRequests().catch(() => {}),
        clearUserNotifications().catch(() => {}),
      ]);
      const { items: next, hasMore: more } = await load();
      setItems(next);
      setHasMore(more);
      setPage(0);
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const grouped = useMemo(() => {
    if (!items) return [];
    const map = new Map<Group, NotifItem[]>();
    for (const item of items) {
      const g = groupOf(item);
      const bucket = map.get(g) ?? [];
      bucket.push(item);
      map.set(g, bucket);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g) as NotifItem[],
    }));
  }, [items]);

  // Tick periódico para tempos relativos/agendados sem impureza no render.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = useMemo(
    () => (items ?? []).filter((i) => i.unread).length,
    [items],
  );
  const scheduledCount = useMemo(
    () => (items ?? []).filter((i) => i.fireAt && i.fireAt.getTime() > now).length,
    [items, now],
  );

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Notificações</h1>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {items === null ? (
            <div className="glass-card p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-5">A carregar…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-card border border-border flex items-center justify-center mb-6">
                <BellOff className="h-11 w-11 text-muted-foreground/60" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Sem notificações</h3>
              <p className="text-sm text-muted-foreground mb-8">
                Os alarmes da Hora do Boom aparecem aqui quando os ativares.
              </p>
              <Button variant="secondary" onClick={() => navigate("/horarios")}>
                <AlarmClock className="h-4 w-4 text-accent" />
                Ativar alarmes
              </Button>
            </div>
          ) : (
            <>
              {/* Resumo / limpar tudo */}
              <div className="glass-card p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                    {unreadCount > 0 ? (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Caixa de entrada</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} por ler` : "Tudo lido"}
                      {scheduledCount > 0 ? ` · ${scheduledCount} ⏰` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearAll}
                  disabled={busyId === "all"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">Limpar tudo</span>
                </button>
              </div>

              {/* Lista agrupada por data */}
              {grouped.map(({ group, items: groupItems }) => (
                <div key={group} className="mb-6">
                  <p className="text-xs font-extrabold tracking-widest uppercase text-muted-foreground/70 mb-3">
                    {GROUP_LABEL[group]}
                  </p>
                  <div className="space-y-2">
                    {groupItems.map((item) => {
                      const s = KIND_STYLE[item.kind];
                      const Icon = s.icon;
                      const busy = busyId === item.identifier;
                      const isPendingPlan = item.source === "plan-request";
                      const date = itemDate(item);
                      const meta = isPendingPlan
                        ? "Em análise"
                        : item.fireAt && item.fireAt.getTime() > now
                          ? `Agendado para ${pad2(item.fireAt.getHours())}:${pad2(item.fireAt.getMinutes())}`
                          : item.createdAt
                            ? relativeTime(date)
                            : formatFire(item.fireAt);
                      return (
                        <div
                          key={item.identifier}
                          className={cn(
                            "glass-card p-4 flex items-center gap-3",
                            item.unread && "border-primary/55",
                          )}>
                          <div
                            className={cn(
                              "relative w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                              s.bg,
                              s.border,
                            )}>
                            <Icon className={cn("h-5 w-5", s.text)} />
                            {item.unread ? (
                              <span
                                className={cn(
                                  "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                                  s.text,
                                )}
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={cn(
                                  "text-sm truncate",
                                  item.unread ? "font-semibold" : "font-medium",
                                )}>
                                {item.title}
                              </p>
                              {!isPendingPlan && item.source !== "remote" && item.fireAt ? (
                                <Badge variant="warning" className="px-1 py-0 text-[10px]">
                                  ⏰
                                </Badge>
                              ) : null}
                            </div>
                            {item.body ? (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.body}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground/70">{meta}</p>
                          </div>
                          {isPendingPlan ? (
                            <Badge variant="warning" className="shrink-0">
                              Pendente
                            </Badge>
                          ) : (
                            <button
                              onClick={() => remove(item.identifier)}
                              disabled={busy}
                              aria-label={`Apagar ${item.title}`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-destructive disabled:opacity-50 transition-colors shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-2">
                {hasMore ? (
                  <Button variant="outline" className="w-full" onClick={loadMore}>
                    Carregar mais
                  </Button>
                ) : null}
                <Button variant="secondary" className="w-full mt-3" onClick={() => navigate("/horarios")}>
                  <AlarmClock className="h-4 w-4 text-accent" />
                  Gerenciar Alertas
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}