import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/adminGate";
import * as adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { Flag, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AdminDashboardTab, type AdminDashboardStats } from "@/components/admin/AdminDashboardTab";
import { AdminSignalsTab } from "@/components/admin/AdminSignalsTab";
import { AdminBoomHoursTab } from "@/components/admin/AdminBoomHoursTab";
import { AdminComunidadeTab } from "@/components/admin/AdminComunidadeTab";
import { AdminBoomTimesTab } from "@/components/admin/AdminBoomTimesTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminReceiptsTab } from "@/components/admin/AdminReceiptsTab";
import { AdminWithdrawalsTab } from "@/components/admin/AdminWithdrawalsTab";
import { AdminMessagingTab } from "@/components/admin/AdminMessagingTab";
import { AdminReportsTab } from "@/components/admin/AdminReportsTab";
import { AdminChannelsTab } from "@/components/admin/AdminChannelsTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { NotificationListModal } from "@/components/admin/NotificationListModal";
import { SkeletonList } from "@/components/admin/SkeletonList";

type Tab = "dashboard" | "receipts" | "signals" | "boom" | "boom_times" | "posts" | "users" | "withdrawals" | "messaging" | "reports" | "channels" | "announcements";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "receipts", label: "Comprovativos" },
  { key: "signals", label: "Sinais" },
  { key: "boom", label: "Boom Hours" },
  { key: "boom_times", label: "Boom Times" },
  { key: "posts", label: "Posts" },
  { key: "users", label: "Usuários" },
  { key: "withdrawals", label: "Levantamentos" },
  { key: "messaging", label: "Mensagens" },
  { key: "reports", label: "Reports" },
  { key: "channels", label: "Canais" },
  { key: "announcements", label: "Anúncios" },
];

type AdminRow = Record<string, unknown>;

export default function Admin() {
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
    total: 0, active: 0, tp: 0, sl: 0, users: 0, premium: 0, expiring: 0, pendingReceipts: 0,
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
    const { data: usersData } = await supabase.rpc("get_all_users");
    setUsersList(usersData || []);
    const { data: subsResult } = await supabase.from("subscriptions").select("*");
    setSubsData(subsResult || []);
    const { data: usersCountData } = await supabase.rpc("get_users_count");
    const usersCount = usersCountData || 0;
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
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
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
            <h1 className="font-display text-2xl font-bold flex-1">Admin</h1>
            <Button variant="ghost" size="icon" onClick={loadData} aria-label="Atualizar">
              <RefreshCw className="h-5 w-5" />
            </Button>
            <NotificationBadge count={unreadAdmin} onPress={() => setShowNotifications(true)} />
            {pendingReports > 0 && (
              <button
                onClick={() => setTab("reports")}
                className="flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning hover:opacity-90"
                title="Reports por rever"
              >
                <Flag className="h-3.5 w-3.5" />
                {pendingReports}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === tb.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "dashboard" && (
            <AdminDashboardTab stats={stats} busy={busy} run={run} onRefresh={loadData} />
          )}
          {tab === "receipts" && <AdminReceiptsTab />}
          {tab === "signals" && <AdminSignalsTab signals={signals} onRefresh={loadData} />}
          {tab === "boom" && <AdminBoomHoursTab boomHours={boomHours} onRefresh={loadData} />}
          {tab === "boom_times" && <AdminBoomTimesTab boomTimes={boomTimes} onRefresh={loadData} />}
          {tab === "posts" && <AdminComunidadeTab posts={posts} onRefresh={loadData} />}
          {tab === "users" && <AdminUsersTab usersList={usersList} subsData={subsData} />}
          {tab === "withdrawals" && <AdminWithdrawalsTab />}
          {tab === "messaging" && <AdminMessagingTab />}
          {tab === "reports" && <AdminReportsTab />}
          {tab === "channels" && <AdminChannelsTab />}
          {tab === "announcements" && <AdminAnnouncementsTab />}
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
            toast.error(e instanceof Error ? e.message : "Erro ao marcar notificação");
          }
        }}
        onMarkAllRead={async () => {
          try {
            await adminApi.markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadAdmin(0);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro ao marcar notificações");
          }
        }}
      />
    </Layout>
  );
}
