import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/adminGate";
import * as adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import {
  Banknote,
  Coins,
  Flag,
  Hash,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Newspaper,
  ReceiptText,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AdminDashboardTab, type AdminDashboardStats } from "@/components/admin/AdminDashboardTab";
import { AdminSignalsTab } from "@/components/admin/AdminSignalsTab";
import { AdminBoomHoursTab } from "@/components/admin/AdminBoomHoursTab";
import { AdminComunidadeTab } from "@/components/admin/AdminComunidadeTab";
import { AdminBoomTimesTab } from "@/components/admin/AdminBoomTimesTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminReceiptsTab } from "@/components/admin/AdminReceiptsTab";
import { AdminWithdrawalsTab } from "@/components/admin/AdminWithdrawalsTab";
import { AdminCapitalTab } from "@/components/admin/AdminCapitalTab";
import { AdminMessagingTab } from "@/components/admin/AdminMessagingTab";
import { AdminReportsTab } from "@/components/admin/AdminReportsTab";
import { AdminChannelsTab } from "@/components/admin/AdminChannelsTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { NotificationListModal } from "@/components/admin/NotificationListModal";
import { SkeletonList } from "@/components/admin/SkeletonList";

type Tab = "dashboard" | "receipts" | "signals" | "boom" | "boom_times" | "posts" | "users" | "withdrawals" | "capital" | "messaging" | "reports" | "channels" | "announcements";

const TABS: { key: Tab; labelKey: string; icon: LucideIcon }[] = [
  { key: "dashboard", labelKey: "admin.tabDashboard", icon: LayoutDashboard },
  { key: "receipts", labelKey: "admin.tabReceipts", icon: ReceiptText },
  { key: "signals", labelKey: "admin.tabSignals", icon: TrendingUp },
  { key: "boom", labelKey: "admin.tabBoom", icon: Zap },
  { key: "boom_times", labelKey: "admin.tabBoomTimes", icon: Clock },
  { key: "posts", labelKey: "admin.tabPosts", icon: Newspaper },
  { key: "users", labelKey: "admin.tabUsers", icon: Users },
  { key: "withdrawals", labelKey: "admin.tabWithdrawals", icon: Banknote },
  { key: "capital", labelKey: "admin.tabCapital", icon: Coins },
  { key: "messaging", labelKey: "admin.tabMessaging", icon: MessagesSquare },
  { key: "reports", labelKey: "admin.tabReports", icon: Flag },
  { key: "channels", labelKey: "admin.tabChannels", icon: Hash },
  { key: "announcements", labelKey: "admin.tabAnnouncements", icon: Megaphone },
];

type AdminRow = Record<string, unknown>;

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signals, setSignals] = useState<AdminRow[]>([]);
  const [posts, setPosts] = useState<AdminRow[]>([]);
  const [subsData, setSubsData] = useState<AdminRow[]>([]);
  const [boomTimes, setBoomTimes] = useState<AdminRow[]>([]);
  const [boomHours, setBoomHours] = useState<AdminRow[]>([]);
  const [usersList, setUsersList] = useState<AdminRow[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats>({
    total: 0, active: 0, tp: 0, sl: 0, users: 0, activeUsers: 0, premium: 0, expiring: 0, pendingReceipts: 0,
  });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [notifications, setNotifications] = useState<adminApi.AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadAdmin, setUnreadAdmin] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  const refreshNotifications = useCallback(async () => {
    try {
      const notifs = await adminApi.getNotifications(50);
      setNotifications(notifs);
      setUnreadAdmin(notifs.filter((n) => !n.read).length);
    } catch {
      // mantém o estado atual se a consulta falhar
    }
  }, []);

  const loadData = async () => {
    const { data: signalsData } = await supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(100);
    setSignals(signalsData || []);
    // O RPC get_all_users foi revogado de authenticated (20260809000000) e o
    // select directo de subscriptions só devolve a própria linha (RLS own).
    // A edge function list_users usa service_role e devolve users + estado da
    // subscrição; é ela que alimenta a lista e as estatísticas.
    let userRows: AdminRow[] = [];
    let subsRows: AdminRow[] = [];
    let usersCount = 0;
    let activeUsers = 0;
    try {
      const users = await adminApi.listUsers();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      userRows = users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
        role: u.role ?? "free",
        subscription_status: u.subscription_status ?? null,
        subscription_expires: u.subscription_expires ?? null,
      }));
      subsRows = users.map((u) => ({
        user_id: u.id,
        plan: u.role ?? "free",
        status: u.subscription_status ?? null,
        current_period_end: u.subscription_expires ?? null,
      }));
      usersCount = users.length;
      activeUsers = users.filter((u) => {
        const ts = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : Number.NaN;
        return Number.isFinite(ts) && now - ts < THIRTY_DAYS_MS;
      }).length;
    } catch (e: unknown) {
      console.warn("[admin] listUsers error:", e instanceof Error ? e.message : e);
    }
    setUsersList(userRows);
    setSubsData(subsRows);
    const { data: boomData } = await supabase.from("boom_hours").select("*").order("created_at", { ascending: true });
    setBoomHours(boomData || []);
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(20);
    setPosts(postsData || []);
    const { data: boomTimesData } = await supabase.from("boom_times").select("*").order("boom_time", { ascending: false }).limit(20);
    setBoomTimes(boomTimesData || []);

    const premium = await adminApi.premiumCount().catch(() => 0);
    const expiring = await adminApi.expiringCount().catch(() => 0);
    let pendingReceipts = 0;
    try {
      const allReceipts = await adminApi.listReceipts();
      pendingReceipts = allReceipts.filter((r) => r.status === "pending").length;
    } catch (e: unknown) {
      console.warn("[admin] listReceipts error:", e instanceof Error ? e.message : e);
    }

    const s = signalsData || [];
    setStats({
      total: s.length,
      active: s.filter((x) => x.status === "active").length,
      tp: s.filter((x) => x.status === "tp").length,
      sl: s.filter((x) => x.status === "sl").length,
      users: usersCount || 0,
      activeUsers,
      premium,
      expiring,
      pendingReceipts,
    });

    await refreshNotifications();
    try {
      const count = await adminApi.reportCount();
      setPendingReports(count);
    } catch {
      // mantém o valor atual se a consulta falhar
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdminEmail(user.email)) { navigate("/"); return; }
      if (user && isAdminEmail(user.email) && !isAdminUnlocked()) { navigate("/admin-gate", { replace: true }); return; }
      await loadData();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh notifications count every 30s.
  useEffect(() => {
    const timer = setInterval(refreshNotifications, 30_000);
    return () => clearInterval(timer);
  }, [refreshNotifications]);

  const run = async (label: string, fn: () => Promise<number>) => {
    setBusy(true);
    try {
      const n = await fn();
      toast.success(`${label}: ${n}`);
      await loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("adminErrors.unknown"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <SkeletonList count={6} variant="row" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold flex-1">{t("admin.title")}</h1>
            <Button variant="ghost" size="icon" onClick={loadData} aria-label={t("admin.refresh")}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <NotificationBadge count={unreadAdmin} onPress={() => setShowNotifications(true)} />
            {pendingReports > 0 && (
              <button
                onClick={() => setTab("reports")}
                className="flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning hover:opacity-90"
                title={t("admin.reportsToReview")}
              >
                <Flag className="h-3.5 w-3.5" />
                {pendingReports}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Navegação */}
            <nav aria-label={t("admin.title")} className="lg:w-60 lg:shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-2 lg:pb-2">
                {TABS.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.key;
                  return (
                    <button
                      key={tb.key}
                      onClick={() => setTab(tb.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:w-full",
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/70 lg:bg-transparent lg:hover:bg-secondary/60",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-muted-foreground")} />
                      <span>{t(tb.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1">
              {tab === "dashboard" && (
                <AdminDashboardTab stats={stats} busy={busy} run={run} onRefresh={loadData} />
              )}
              {tab === "receipts" && <AdminReceiptsTab />}
              {tab === "signals" && <AdminSignalsTab signals={signals} onRefresh={loadData} />}
              {tab === "boom" && <AdminBoomHoursTab boomHours={boomHours} onRefresh={loadData} />}
              {tab === "boom_times" && <AdminBoomTimesTab boomTimes={boomTimes} onRefresh={loadData} />}
              {tab === "posts" && <AdminComunidadeTab posts={posts} onRefresh={loadData} />}
              {tab === "users" && <AdminUsersTab usersList={usersList} subsData={subsData} onRefresh={loadData} />}
              {tab === "withdrawals" && <AdminWithdrawalsTab />}
              {tab === "capital" && <AdminCapitalTab />}
              {tab === "messaging" && <AdminMessagingTab />}
              {tab === "reports" && <AdminReportsTab />}
              {tab === "channels" && <AdminChannelsTab />}
              {tab === "announcements" && <AdminAnnouncementsTab />}
            </div>
          </div>
        </div>
      </section>

      <NotificationListModal
        open={showNotifications}
        notifications={notifications}
        onClose={() => {
          setShowNotifications(false);
          refreshNotifications();
        }}
        onMarkRead={async (id) => {
          try {
            await adminApi.markNotificationRead(id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
            setUnreadAdmin((prev) => Math.max(0, prev - 1));
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("adminErrors.markRead"));
          }
        }}
        onMarkAllRead={async () => {
          try {
            await adminApi.markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadAdmin(0);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("adminErrors.markAllRead"));
          }
        }}
      />
    </Layout>
  );
}
