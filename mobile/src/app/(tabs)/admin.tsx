import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Card, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { generateSignalsNow } from '@/lib/cryptoSignals';
import {
  PairChips, ConfidencePresets, TimePresets, SignalTypeToggle, SessionPresets, QuickChips,
  SearchBar, FilterChips, BulkActionsBar, SkeletonList, Toast, ExportButton,
  NotificationBadge, NotificationListModal, UserDetailModal,
} from '@/components/admin';
import { WithdrawalsPanel, MessagingPanel, ReportsPanel, ChannelsPanel, AnnouncementsPanel } from '@/components/admin';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { supabase, isAdminEmail } from '@/lib/supabase';
import { isAdminUnlocked } from '@/lib/adminGate';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/lib/adminApi';
import { formatSymbol, formatTimeframe } from '@/core/format';
import type { BoomHour, BoomTime, AdminNotification, UserWithSubscription } from '@/core/types';
import { VOLATILITY_LEVELS, BADGE_OPTIONS, WAT_TIMES, SIGNAL_REASONS, POST_TITLES } from '@/core/presets';
import type { SessionPreset } from '@/core/presets';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';

type Tab = 'dashboard' | 'signals' | 'boom' | 'boom_times' | 'posts' | 'users' | 'receipts' | 'withdrawals' | 'messaging' | 'reports' | 'channels' | 'announcements';

const TABS = [
  { key: 'dashboard' as const, labelKey: 'admin.tabDashboard' as const },
  { key: 'receipts' as const, labelKey: 'admin.tabReceipts' as const },
  { key: 'signals' as const, labelKey: 'admin.tabSignals' as const },
  { key: 'boom' as const, labelKey: 'admin.tabBoom' as const },
  { key: 'boom_times' as const, labelKey: 'admin.tabBoomTimes' as const },
  { key: 'posts' as const, labelKey: 'admin.tabPosts' as const },
  { key: 'users' as const, labelKey: 'admin.tabUsers' as const },
  { key: 'withdrawals' as const, labelKey: 'admin.tabWithdrawals' as const },
  { key: 'messaging' as const, labelKey: 'admin.tabMessaging' as const },
  { key: 'reports' as const, labelKey: 'admin.tabReports' as const },
  { key: 'channels' as const, labelKey: 'admin.tabChannels' as const },
  { key: 'announcements' as const, labelKey: 'admin.tabAnnouncements' as const },
];

interface PostRow {
  id: string;
  title: string;
  content?: string;
  pair?: string;
  signal_type?: string;
  image_url?: string;
  is_active?: boolean;
  created_at: string;
}

const formatTime = (mins: number) => {
  const d = new Date(Date.now() + mins * 60_000);
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

const lastSeenAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};

const receiptTimeAgo = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
};

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { user } = useAuth();
  const alerts = useAdminAlerts();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, tp: 0, sl: 0, users: 0, premium: 0, expiring: 0, pendingReceipts: 0 });
  const [signals, setSignals] = useState<any[]>([]);
  const [boomHours, setBoomHours] = useState<BoomHour[]>([]);
  const [boomTimes, setBoomTimes] = useState<BoomTime[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; role?: string; subscription_status?: string; subscription_expires?: string }[]>([]);
  const [receipts, setReceipts] = useState<adminApi.PaymentReceipt[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  const loadData = useCallback(async () => {
    const [sRes, usersRes, boomHoursRes, boomTimesRes, postsRes] = await Promise.all([
      supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(60),
      supabase.rpc('get_users_count'),
      supabase.from('boom_hours').select('*').order('time_wat', { ascending: true }),
      supabase.from('boom_times').select('*').order('boom_time', { ascending: false }).limit(20),
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const s = sRes.data || [];
    setSignals(s);
    setBoomHours((boomHoursRes.data || []) as BoomHour[]);
    setBoomTimes((boomTimesRes.data || []) as BoomTime[]);
    setPosts((postsRes.data || []) as PostRow[]);
    const premium = await adminApi.premiumCount().catch(() => 0);
    const expiring = await adminApi.expiringCount().catch(() => 0);
    let allReceipts: adminApi.PaymentReceipt[] = [];
    try {
      allReceipts = await adminApi.listReceipts();
      setReceipts(allReceipts);
    } catch (e: any) {
      console.warn('[admin] listReceipts error:', e?.message);
      Alert.alert('Erro', 'Não foi possível carregar comprovativos. Verifique a ligação.');
    }
    const pendingReceipts = allReceipts.filter((r) => r.status === 'pending').length;
    setStats({
      total: s.length,
      active: s.filter((x: any) => x.status === 'active').length,
      tp: s.filter((x: any) => x.status === 'tp').length,
      sl: s.filter((x: any) => x.status === 'sl').length,
      users: usersRes.data || 0,
      premium,
      expiring,
      pendingReceipts,
    });
    adminApi.listUsers().then(setUsers).catch((e) => console.warn('[admin] listUsers error:', e?.message));
    try {
      const notifs = await adminApi.getNotifications(50);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: AdminNotification) => !n.read).length);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    const timer = setTimeout(() => {
      loadData().finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [user, loadData]);

  useEffect(() => {
    if (user && isAdminEmail(user.email) && !isAdminUnlocked()) {
      router.replace('/admin-gate');
    }
  }, [user]);

  useEffect(() => { adminApi.reportCount().then(setPendingReports).catch(() => {}); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!user) return <Spinner label={t('admin.checkingAccess')} />;
  if (!isAdminEmail(user.email)) {
    return (
      <Screen safeTop>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed" size={44} color={colors.textMuted} />
          <AppText variant="h1" style={{ textAlign: 'center' }}>{t('admin.restrictedTitle')}</AppText>
          <AppText variant="muted" style={{ textAlign: 'center' }}>
            {t('admin.restrictedDesc')}
          </AppText>
        </View>
      </Screen>
    );
  }
  if (!isAdminUnlocked()) return <Spinner label={t('admin.gateLockedTitle')} />;
  if (loading) return <Screen><SkeletonList count={6} variant="row" /></Screen>;

  const run = async (label: string, fn: () => Promise<number>) => {
    setBusy(true);
    try {
      const n = await fn();
      alerts.showSuccess(`${label}: ${n}`);
      await loadData();
    } catch (e: any) {
      alerts.showError(e?.message || t('admin.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen safeTop>
      {alerts.toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={alerts.dismiss} />
      ))}

      <View style={styles.header}>
        <Pressable onPress={() => onRefresh()} hitSlop={8} style={styles.headerRefresh}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </Pressable>
        <AppText variant="h1" style={styles.headerTitle}>{t('admin.title')}</AppText>
        <NotificationBadge count={unreadCount} onPress={() => setShowNotifications(true)} />
        {pendingReports > 0 && (
          <Pressable onPress={() => setTab('reports')} style={styles.reportBadge}>
            <Ionicons name="flag" size={14} color={colors.warning} />
            <AppText variant="small" style={{ color: colors.warning }}>{pendingReports}</AppText>
          </Pressable>
        )}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((tb) => (
          <Chip key={tb.key} label={t(tb.labelKey)} active={tab === tb.key} onPress={() => setTab(tb.key)} />
        ))}
      </View>

      {tab === 'dashboard' ? (
        <DashboardPanel stats={stats} busy={busy} run={run} t={t} onRefresh={loadData} />
      ) : tab === 'receipts' ? (
        <ReceiptsPanel receipts={receipts} onRefresh={loadData} refreshing={refreshing} onPullRefresh={onRefresh} />
      ) : tab === 'signals' ? (
        <SignalsPanel signals={signals} onRefresh={loadData} refreshing={refreshing} onPullRefresh={onRefresh} />
      ) : tab === 'boom' ? (
        <BoomHoursPanel hours={boomHours} onRefresh={loadData} refreshing={refreshing} onPullRefresh={onRefresh} />
      ) : tab === 'boom_times' ? (
        <BoomTimesPanel times={boomTimes} onRefresh={loadData} refreshing={refreshing} onPullRefresh={onRefresh} />
      ) : tab === 'posts' ? (
        <PostsPanel posts={posts} onRefresh={loadData} refreshing={refreshing} onPullRefresh={onRefresh} />
      ) : tab === 'withdrawals' ? (
        <WithdrawalsPanel />
      ) : tab === 'messaging' ? (
        <MessagingPanel />
      ) : tab === 'reports' ? (
        <ReportsPanel />
      ) : tab === 'channels' ? (
        <ChannelsPanel />
      ) : tab === 'announcements' ? (
        <AnnouncementsPanel />
      ) : (
        <UsersPanel users={users} premium={stats.premium} refreshing={refreshing} onPullRefresh={onRefresh} onSelectUser={(u) => { setSelectedUser(u as UserWithSubscription); setShowUserModal(true); }} />
      )}

      <NotificationListModal
        visible={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onMarkRead={async (id) => {
          await adminApi.markNotificationRead(id);
          setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }}
        onMarkAllRead={async () => {
          await adminApi.markAllNotificationsRead();
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setUnreadCount(0);
        }}
      />

      <UserDetailModal
        visible={showUserModal}
        user={selectedUser}
        onClose={() => { setShowUserModal(false); setSelectedUser(null); }}
        onBan={async (userId) => { await adminApi.banUser(userId); await loadData(); }}
        onRoleChange={async (userId, role) => { await adminApi.updateUserRole(userId, role); await loadData(); }}
        onExpiryChange={async (userId, expiresAt) => { await adminApi.updateSubscriptionExpiry(userId, expiresAt); await loadData(); }}
      />
    </Screen>
  );
}

// ---------- Dashboard ----------

function DashboardPanel({
  stats,
  busy,
  run,
  t,
  onRefresh,
}: {
  stats: { total: number; active: number; tp: number; sl: number; users: number; premium: number; expiring: number; pendingReceipts: number };
  busy: boolean;
  run: (label: string, fn: () => Promise<number>) => void;
  t: TFunction;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [generating, setGenerating] = useState(false);
  const [revStats, setRevStats] = useState<Awaited<ReturnType<typeof adminApi.revenueStats>> | null>(null);
  useEffect(() => { adminApi.revenueStats().then(setRevStats).catch(() => {}); }, []);
  const hitRate = stats.tp + stats.sl > 0 ? Math.round((stats.tp / (stats.tp + stats.sl)) * 100) : 0;
  const cards = [
    { label: t('admin.statUsers'), value: stats.users.toLocaleString('pt-PT'), color: colors.secondary, icon: 'people' as const },
    { label: t('admin.statSignalsToday'), value: stats.total, color: colors.success, icon: 'trending-up' as const },
    { label: t('admin.statWinRate'), value: `${hitRate}%`, color: colors.accent, icon: 'analytics' as const },
    { label: t('admin.statPremium'), value: stats.premium, color: colors.accent, icon: 'diamond' as const },
    { label: t('admin.statExpiring' as any), value: stats.expiring, color: colors.warning, icon: 'time-outline' as const },
    { label: t('admin.statPendingReceipts' as any), value: stats.pendingReceipts, color: colors.warning, icon: 'receipt-outline' as const },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={colors.primary} />}
    >
      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={styles.statCard}>
            <Ionicons name={c.icon} size={20} color={c.color} />
            <AppText variant="h1" style={{ color: colors.text }}>{c.value}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>{c.label}</AppText>
          </View>
        ))}
        {revStats && (
          <>
            <Card style={styles.statCard}>
              <AppText variant="small" style={styles.statLabel}>Receita (Mês)</AppText>
              <AppText variant="h1">${(revStats.thisMonthRevenue.usd ?? 0).toFixed(2)}</AppText>
              <AppText variant="small" style={styles.statLabel}>
                {(revStats.thisMonthRevenue.aoa ?? 0).toLocaleString('pt-PT')} Kz
              </AppText>
            </Card>
            <Card style={styles.statCard}>
              <AppText variant="small" style={styles.statLabel}>Pagamentos</AppText>
              <AppText variant="h1">{revStats.thisMonthCount}</AppText>
            </Card>
            <Card style={styles.statCard}>
              <AppText variant="small" style={styles.statLabel}>Levantamentos Pendentes</AppText>
              <AppText variant="h1" style={{ color: colors.warning }}>${(revStats.pendingWithdrawalsAmount.usd ?? 0).toFixed(2)}</AppText>
              <AppText variant="small" style={styles.statLabel}>
                {(revStats.pendingWithdrawalsAmount.aoa ?? 0).toLocaleString('pt-PT')} Kz
              </AppText>
            </Card>
          </>
        )}
      </View>

      <View style={styles.actionRow}>
        <AppButton
          title={generating ? 'A gerar...' : t('admin.generateSignals')}
          variant="primary"
          loading={generating || busy}
          style={{ flex: 1 }}
          onPress={async () => {
            setGenerating(true);
            try {
              const result = await generateSignalsNow();
              if (result.ok && result.count > 0) {
                Alert.alert(t('admin.doneGenerate'), `${result.count}`);
              } else {
                Alert.alert(t('admin.generateSignals'), result.error || t('admin.noSignalsFound'));
              }
              onRefresh();
            } catch (e: any) {
              Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
            } finally {
              setGenerating(false);
            }
          }}
        />
        <AppButton title={t('admin.closeTpSl')} variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => run(t('admin.doneClose'), adminApi.closeSignals)} />
      </View>
    </ScrollView>
  );
}

// ---------- Sinais ----------

function SignalsPanel({ signals, onRefresh, refreshing, onPullRefresh }: { signals: any[]; onRefresh: () => void; refreshing: boolean; onPullRefresh: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState('EURUSD');
  const [signalType, setSignalType] = useState<'BUY' | 'SELL'>('BUY');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: signals,
    searchFields: ['symbol', 'signal_type'],
    filterConfig: [
      { key: 'buy', label: 'BUY', value: 'BUY' },
      { key: 'sell', label: 'SELL', value: 'SELL' },
    ],
    filterField: 'signal_type',
  });

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await adminApi.bulkDeleteSignals(selectedIds);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
    }
  };

  const add = async () => {
    try {
      await adminApi.addSignal({
        symbol,
        timeframe: '1h',
        signal_type: signalType,
        entry_price: Number(entry),
        stop_loss: Number(sl),
        target_price: Number(tp),
        confidence,
        reasons: selectedReasons,
      });
      setEntry(''); setSl(''); setTp(''); setSelectedReasons([]);
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addSignalError'));
    }
  };

  const SIGNAL_FILTERS = [
    { key: 'buy', label: 'BUY', value: 'BUY' },
    { key: 'sell', label: 'SELL', value: 'SELL' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newSignal')}
      </AppText>

      <PairChips selected={symbol} onSelect={setSymbol} />

      <SignalTypeToggle value={signalType} onChange={setSignalType} />

      <ConfidencePresets value={confidence} onChange={setConfidence} />

      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.entryLabel')} value={entry} onChangeText={setEntry} keyboardType="numeric" placeholder="1.0850" />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.slLabel')} value={sl} onChangeText={setSl} keyboardType="numeric" placeholder="1.0800" />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.tpLabel')} value={tp} onChangeText={setTp} keyboardType="numeric" placeholder="1.0920" />
        </View>
      </View>

      <QuickChips
        label={t('admin.reasonsLabel')}
        options={SIGNAL_REASONS}
        selected=""
        onSelect={() => {}}
        multiSelect
        selectedValues={selectedReasons}
        onToggle={toggleReason}
      />
      <AppButton title={t('admin.addSignal')} onPress={add} />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterChips
        filters={SIGNAL_FILTERS}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.signalsList', { count: filteredData.length })}
      </AppText>
      {filteredData.length === 0 ? <EmptyState title={t('admin.noSignalsAdmin')} /> : filteredData.map((s) => (
        <Pressable key={s.id} onPress={() => toggleSelect(s.id)} style={[styles.row, selectedIds.includes(s.id) && { borderColor: colors.primary }]}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedIds.includes(s.id) ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs }}>
            {selectedIds.includes(s.id) && <Ionicons name="checkmark" size={12} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(s.symbol)} · {formatTimeframe(s.timeframe)}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>{s.signal_type} · {s.confidence}% · E{s.entry_price}</AppText>
          </View>
          <Badge color={s.status === 'active' ? colors.success : s.status === 'tp' ? colors.success : s.status === 'sl' ? colors.destructive : colors.textMuted}>
            {s.status}
          </Badge>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'tp' ? 'active' : 'tp').then(onRefresh)} hitSlop={8}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </Pressable>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'sl' ? 'active' : 'sl').then(onRefresh)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.destructive} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteSignalTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteSignal(s.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}
      <BulkActionsBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onCancel={() => setSelectedIds([])} />
    </ScrollView>
  );
}

// ---------- Hora do Boom ----------

function BoomHoursPanel({ hours, onRefresh, refreshing, onPullRefresh }: { hours: BoomHour[]; onRefresh: () => void; refreshing: boolean; onPullRefresh: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [timeWat, setTimeWat] = useState('');
  const [timeGmt, setTimeGmt] = useState('');
  const [pairs, setPairs] = useState('');
  const [vol, setVol] = useState('3');
  const [badge, setBadge] = useState('⚡');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: hours as (Record<string, unknown> & BoomHour)[],
    searchFields: ['title'],
    filterConfig: [
      { key: 'vol1', label: 'Vol 1', value: '1' },
      { key: 'vol2', label: 'Vol 2', value: '2' },
      { key: 'vol3', label: 'Vol 3', value: '3' },
      { key: 'vol4', label: 'Vol 4', value: '4' },
      { key: 'vol5', label: 'Vol 5', value: '5' },
    ],
    filterField: 'volatility',
  });

  const applyPreset = (preset: SessionPreset) => {
    setTitle(preset.title);
    setTimeWat(preset.time_wat);
    setTimeGmt(preset.time_gmt);
    setPairs(preset.pairs.join(', '));
    setVol(String(preset.volatility));
    setBadge(preset.badge);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await adminApi.bulkDeleteBoomHours(selectedIds);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
    }
  };

  const add = async () => {
    try {
      await adminApi.addBoomHour({
        title,
        time_wat: timeWat,
        time_gmt: timeGmt,
        pairs: pairs.split(',').map((p) => p.trim()).filter(Boolean),
        days: '',
        description: '',
        volatility: Number(vol) || 1,
        badge,
      });
      setTitle(''); setTimeWat(''); setTimeGmt(''); setPairs(''); setVol('3'); setBadge('⚡');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addHourError'));
    }
  };

  const VOL_FILTERS = [
    { key: 'vol1', label: 'Vol 1', value: '1' },
    { key: 'vol2', label: 'Vol 2', value: '2' },
    { key: 'vol3', label: 'Vol 3', value: '3' },
    { key: 'vol4', label: 'Vol 4', value: '4' },
    { key: 'vol5', label: 'Vol 5', value: '5' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <SessionPresets onSelect={applyPreset} />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newHour')}
      </AppText>
      <AppInput label={t('admin.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('admin.titlePlaceholder')} />

      <QuickChips
        label={t('admin.watLabel')}
        options={WAT_TIMES.map((w) => w.time)}
        selected={timeWat}
        onSelect={(time) => {
          setTimeWat(time);
          const [h, m] = time.split(':').map(Number);
          const gmtH = h - 1;
          setTimeGmt(`${String(gmtH < 0 ? gmtH + 24 : gmtH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }}
      />

      <PairChips selected={pairs.split(',')[0]?.trim() || ''} onSelect={(p) => setPairs(pairs ? `${pairs}, ${p}` : p)} />

      <View style={styles.volRow}>
        <AppText variant="label" style={{ color: colors.textMuted }}>{t('admin.volLabel')}</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {VOLATILITY_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              onPress={() => setVol(String(level.value))}
              style={[
                styles.volChip,
                Number(vol) === level.value
                  ? { backgroundColor: level.color, borderColor: level.color }
                  : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}>
              <AppText variant="small" style={{
                color: Number(vol) === level.value ? '#1A1A2E' : colors.textMuted,
                fontWeight: '600',
              }}>
                {level.value}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.badgeRow}>
        <AppText variant="label" style={{ color: colors.textMuted }}>{t('admin.badgeSelect')}</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {BADGE_OPTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setBadge(emoji)}
              style={[
                styles.badgeChip,
                badge === emoji
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}>
              <AppText variant="body">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <AppButton title={t('admin.addHour')} onPress={add} />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterChips
        filters={VOL_FILTERS}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.hoursList', { count: filteredData.length })}
      </AppText>
      {filteredData.length === 0 ? <EmptyState title={t('admin.noHours')} /> : filteredData.map((h) => (
        <Pressable key={h.id} onPress={() => toggleSelect(h.id)} style={[styles.row, selectedIds.includes(h.id) && { borderColor: colors.primary }]}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedIds.includes(h.id) ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs }}>
            {selectedIds.includes(h.id) && <Ionicons name="checkmark" size={12} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{h.badge} {h.title}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {h.time_wat} WAT · Vol {h.volatility} · {h.pairs.join(', ')}
            </AppText>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteHourTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomHour(h.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}
      <BulkActionsBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onCancel={() => setSelectedIds([])} />
    </ScrollView>
  );
}

// ---------- Boom Times ----------

function BoomTimesPanel({ times, onRefresh, refreshing, onPullRefresh }: { times: BoomTime[]; onRefresh: () => void; refreshing: boolean; onPullRefresh: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [pair, setPair] = useState('EURUSD');
  const [confidence, setConfidence] = useState(75);
  const [inMinutes, setInMinutes] = useState(120);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: times as (Record<string, unknown> & BoomTime)[],
    searchFields: ['pair'],
    filterConfig: [
      { key: 'buy', label: 'BUY', value: 'BUY' },
      { key: 'sell', label: 'SELL', value: 'SELL' },
      { key: 'pending', label: 'Pending', value: '' },
    ],
    filterField: 'result',
  });

  const add = async () => {
    const boomTime = new Date(Date.now() + inMinutes * 60_000).toISOString();
    try {
      await adminApi.addBoomTime({
        pair,
        boom_time: boomTime,
        confidence,
        result: '',
        image_url: '',
        audio_url: '',
      });
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addBoomTimeError'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await adminApi.bulkDeleteBoomTimes(selectedIds);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
    }
  };

  const RESULT_FILTERS = [
    { key: 'buy', label: 'BUY', value: 'BUY' },
    { key: 'sell', label: 'SELL', value: 'SELL' },
    { key: 'pending', label: 'Pending', value: '' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newBoomTime')}
      </AppText>

      <PairChips selected={pair} onSelect={setPair} />

      <ConfidencePresets value={confidence} onChange={setConfidence} />

      <TimePresets value={inMinutes} onChange={setInMinutes} />

      <View style={styles.timePreview}>
        <Ionicons name="time-outline" size={14} color={colors.accent} />
        <AppText variant="small" style={{ color: colors.accent }}>
          Boom às {formatTime(inMinutes)}
        </AppText>
      </View>

      <AppButton title={t('admin.addBoomTime')} onPress={add} />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterChips
        filters={RESULT_FILTERS}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.boomTimesList', { count: filteredData.length })}
      </AppText>
      {filteredData.length === 0 ? <EmptyState title={t('admin.noBoomTimes')} /> : filteredData.map((b) => (
        <Pressable key={b.id} onPress={() => toggleSelect(b.id)} style={[styles.row, selectedIds.includes(b.id) && { borderColor: colors.primary }]}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedIds.includes(b.id) ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs }}>
            {selectedIds.includes(b.id) && <Ionicons name="checkmark" size={12} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(b.pair)}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {new Date(b.boom_time).toLocaleString()} · {b.confidence}%
            </AppText>
          </View>
          <Pressable onPress={() => adminApi.updateBoomResult(b.id, b.result === 'BUY' ? 'SELL' : 'BUY').then(onRefresh)} hitSlop={8}>
            <Badge color={b.result === 'BUY' ? colors.success : b.result === 'SELL' ? colors.destructive : colors.textMuted}>
              {b.result || '?'}
            </Badge>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteBoomTimeTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomTime(b.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}
      <BulkActionsBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onCancel={() => setSelectedIds([])} />
    </ScrollView>
  );
}

// ---------- Posts ----------

const POST_TYPES = ['NEUTRO', 'ANÁLISE', 'NOTÍCIA', 'DICA'] as const;

function PostsPanel({ posts, onRefresh, refreshing, onPullRefresh }: { posts: PostRow[]; onRefresh: () => void; refreshing: boolean; onPullRefresh: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pair, setPair] = useState('');
  const [signalType, setSignalType] = useState('NEUTRO');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: posts as (Record<string, unknown> & PostRow)[],
    searchFields: ['title'],
    filterConfig: [
      { key: 'active', label: 'Active', value: 'true' },
      { key: 'inactive', label: 'Inactive', value: 'false' },
    ],
    filterField: 'is_active',
  });

  const add = async () => {
    if (!title.trim()) {
      Alert.alert(t('admin.titleRequired'), t('admin.titleRequiredMsg'));
      return;
    }
    try {
      await adminApi.addPost({
        title: title.trim(),
        content: content.trim(),
        pair: pair.trim().toUpperCase(),
        signal_type: signalType.toUpperCase(),
      });
      setTitle(''); setContent(''); setPair(''); setSignalType('NEUTRO');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addPostError'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await adminApi.bulkDeletePosts(selectedIds);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
    }
  };

  const ACTIVE_FILTERS = [
    { key: 'active', label: 'Active', value: 'true' },
    { key: 'inactive', label: 'Inactive', value: 'false' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newPost')}
      </AppText>

      <QuickChips
        label={t('admin.titleLabel')}
        options={POST_TITLES}
        selected={title}
        onSelect={setTitle}
      />

      <PairChips selected={pair} onSelect={setPair} />

      <QuickChips
        label={t('admin.typeLabel')}
        options={POST_TYPES}
        selected={signalType}
        onSelect={setSignalType}
      />

      <AppInput label={t('admin.contentLabel')} value={content} onChangeText={setContent} multiline numberOfLines={3} placeholder={t('admin.contentPlaceholder')} />
      <AppButton title={t('admin.publishPost')} onPress={add} />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterChips
        filters={ACTIVE_FILTERS}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.postsList', { count: filteredData.length })}
      </AppText>
      {filteredData.length === 0 ? <EmptyState title={t('admin.noPosts')} /> : filteredData.map((p) => (
        <Pressable key={p.id} onPress={() => toggleSelect(p.id)} style={[styles.row, selectedIds.includes(p.id) && { borderColor: colors.primary }]}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedIds.includes(p.id) ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs }}>
            {selectedIds.includes(p.id) && <Ionicons name="checkmark" size={12} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{p.title}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {p.pair ? `${p.pair} · ` : ''}{new Date(p.created_at).toLocaleString()}
            </AppText>
          </View>
          <Badge color={p.is_active === false ? colors.textMuted : colors.success}>
            {p.is_active === false ? t('admin.postInactive') : t('admin.postActive')}
          </Badge>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deletePostTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deletePost(p.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}
      <BulkActionsBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onCancel={() => setSelectedIds([])} />
    </ScrollView>
  );
}

// ---------- Usuários ----------

const USER_ROLE_FILTERS = [
  { key: 'all', label: 'Todos', value: 'all' },
  { key: 'premium', label: 'Premium', value: 'premium' },
  { key: 'free', label: 'Free', value: 'free' },
];

function UsersPanel({
  users,
  premium,
  refreshing,
  onPullRefresh,
  onSelectUser,
}: {
  users: { id: string; email: string; created_at: string; last_sign_in_at: string | null; role?: string; subscription_status?: string; subscription_expires?: string; banned?: boolean }[];
  premium: number;
  refreshing: boolean;
  onPullRefresh: () => void;
  onSelectUser: (user: UserWithSubscription) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const {
    searchQuery, setSearchQuery, filteredData,
  } = useAdminSearch({
    data: users as (Record<string, unknown> & { id: string; email: string; created_at: string; last_sign_in_at: string | null; role?: string; subscription_expires?: string; banned?: boolean })[],
    searchFields: ['email'],
  });

  const roleFiltered = roleFilter === 'all'
    ? filteredData
    : filteredData.filter((u) => (u.role ?? 'free') === roleFilter);

  const totalUsers = users.length;
  const freeCount = users.filter((u) => (u.role ?? 'free') === 'free').length;
  const bannedCount = users.filter((u) => (u as any).banned).length;

  const statCards = [
    { label: 'Total', value: totalUsers, color: colors.text, bg: colors.surface, icon: 'people' as const },
    { label: 'Premium', value: premium, color: colors.accent, bg: colors.accentDim, icon: 'diamond' as const },
    { label: 'Free', value: freeCount, color: colors.primary, bg: colors.primaryDim, icon: 'person' as const },
    { label: 'Banidos', value: bannedCount, color: colors.destructive, bg: 'rgba(255,69,58,0.12)', icon: 'ban' as const },
  ];

  const handleQuickBan = async (u: typeof users[0], e: any) => {
    e.stopPropagation();
    const isBanned = (u as any).banned;
    Alert.alert(
      isBanned ? 'Desbanir utilizador?' : 'Banir utilizador?',
      isBanned ? `Remover o ban de ${u.email}?` : `O utilizador ${u.email} será banido.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isBanned ? 'Desbanir' : 'Banir',
          style: 'destructive',
          onPress: async () => {
            setBusyUserId(u.id);
            try {
              await adminApi.banUser(u.id);
              await onPullRefresh();
            } catch {}
            setBusyUserId(null);
          },
        },
      ],
    );
  };

  const handleQuickRole = async (u: typeof users[0], e: any) => {
    e.stopPropagation();
    const newRole = u.role === 'premium' ? 'free' : 'premium';
    Alert.alert(
      `Alterar role para ${newRole}?`,
      `${u.email} será alterado de ${u.role ?? 'free'} para ${newRole}.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setBusyUserId(u.id);
            try {
              await adminApi.updateUserRole(u.id, newRole);
              await onPullRefresh();
            } catch {}
            setBusyUserId(null);
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.usersStatGrid}>
        {statCards.map((s) => (
          <View key={s.label} style={[styles.usersStatCard, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <AppText variant="h1" style={{ color: s.color, fontSize: 20 }}>{s.value}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>{s.label}</AppText>
          </View>
        ))}
      </View>

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      <View style={styles.usersFilterRow}>
        {USER_ROLE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setRoleFilter(f.value)}
            style={[
              styles.usersFilterChip,
              roleFilter === f.value
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}>
            <AppText variant="small" style={{
              color: roleFilter === f.value ? '#1A1A2E' : colors.textMuted,
              fontWeight: '600',
            }}>
              {f.label}
            </AppText>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <AppText variant="small" style={{ color: colors.textFaint }}>
          {roleFiltered.length} utilizador{roleFiltered.length !== 1 ? 'es' : ''}
        </AppText>
      </View>

      {roleFiltered.length === 0 ? (
        <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersDesc')} />
      ) : (
        roleFiltered.map((u) => {
          const role = u.role ?? 'free';
          const isBanned = (u as any).banned === true;
          const lastSeen = lastSeenAgo(u.last_sign_in_at);
          const initials = u.email?.charAt(0).toUpperCase() ?? '?';
          const avatarColor = isBanned ? colors.destructive : role === 'premium' ? colors.accent : colors.primary;

          return (
            <Pressable
              key={u.id}
              style={[styles.userCard, isBanned && styles.userCardBanned]}
              onPress={() => onSelectUser(u as unknown as UserWithSubscription)}
            >
              <View style={[styles.userAvatar, { backgroundColor: avatarColor }]}>
                <AppText variant="h2" style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
                  {initials}
                </AppText>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.userEmailRow}>
                  <AppText variant="label" numberOfLines={1} style={{ flex: 1, color: isBanned ? colors.textMuted : colors.text }}>
                    {u.email}
                  </AppText>
                  {isBanned && (
                    <View style={styles.userBannedBadge}>
                      <Ionicons name="ban" size={10} color={colors.destructive} />
                      <AppText variant="small" style={{ color: colors.destructive, fontWeight: '700' }}>BAN</AppText>
                    </View>
                  )}
                </View>

                <View style={styles.userMetaRow}>
                  <View style={styles.userMetaItem}>
                    <Ionicons name="time-outline" size={11} color={colors.textFaint} />
                    <AppText variant="small" style={{ color: colors.textFaint }}>
                      {t('admin.registeredAt', { date: new Date(u.created_at).toLocaleDateString('pt-PT') })}
                    </AppText>
                  </View>
                  <View style={styles.userMetaDot} />
                  <View style={styles.userMetaItem}>
                    <Ionicons name={u.last_sign_in_at ? "radio" : "radio-outline"} size={11} color={u.last_sign_in_at ? colors.live : colors.textFaint} />
                    <AppText variant="small" style={{ color: u.last_sign_in_at ? colors.live : colors.textFaint }}>
                      {lastSeen}
                    </AppText>
                  </View>
                </View>

                <View style={styles.userActionsRow}>
                  <View style={[styles.userRoleChip, role === 'premium' && styles.userRoleChipPremium]}>
                    {role === 'premium' && <Ionicons name="diamond" size={11} color={colors.accent} />}
                    <AppText variant="small" style={{ color: role === 'premium' ? colors.accent : colors.textMuted, fontWeight: '600' }}>
                      {role}
                    </AppText>
                  </View>

                  {u.subscription_expires && (
                    <View style={styles.userExpiryChip}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textFaint} />
                      <AppText variant="small" style={{ color: colors.textFaint }}>
                        expira {new Date(u.subscription_expires).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                      </AppText>
                    </View>
                  )}

                  <View style={{ flex: 1 }} />

                  <Pressable
                    onPress={(e) => handleQuickRole(u, e)}
                    hitSlop={6}
                    style={styles.userQuickAction}
                  >
                    <Ionicons name={role === 'premium' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={18} color={colors.accent} />
                  </Pressable>

                  <Pressable
                    onPress={(e) => handleQuickBan(u, e)}
                    hitSlop={6}
                    style={styles.userQuickAction}
                  >
                    <Ionicons name={isBanned ? "checkmark-circle-outline" : "ban-outline"} size={18} color={isBanned ? colors.success : colors.destructive} />
                  </Pressable>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function ReceiptsPanel({
  receipts,
  onRefresh,
  refreshing,
  onPullRefresh,
}: {
  receipts: adminApi.PaymentReceipt[];
  onRefresh: () => void;
  refreshing: boolean;
  onPullRefresh: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: receipts as (Record<string, unknown> & adminApi.PaymentReceipt)[],
    searchFields: ['user_email', 'plan'],
    filterConfig: [
      { key: 'pending', label: 'Pendente', value: 'pending' },
      { key: 'approved', label: 'Aprovado', value: 'approved' },
      { key: 'rejected', label: 'Rejeitado', value: 'rejected' },
    ],
    filterField: 'status',
  });

  const handleApprove = useCallback(async (r: adminApi.PaymentReceipt) => {
    try {
      await adminApi.approveReceipt(r.id);
      onRefresh();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao aprovar comprovativo.');
    } finally {
      setBusyId(null);
    }
  }, [onRefresh]);

  const handleReject = useCallback(async (r: adminApi.PaymentReceipt) => {
    try {
      await adminApi.rejectReceipt(r.id);
      onRefresh();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao rejeitar comprovativo.');
    } finally {
      setBusyId(null);
    }
  }, [onRefresh]);

  const handleDelete = useCallback(async (r: adminApi.PaymentReceipt) => {
    try {
      await adminApi.deleteReceipt(r.id);
      onRefresh();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao eliminar comprovativo.');
    } finally {
      setBusyId(null);
    }
  }, [onRefresh]);

  const pendingCount = receipts.filter((r) => r.status === 'pending').length;
  const approvedCount = receipts.filter((r) => r.status === 'approved').length;
  const rejectedCount = receipts.filter((r) => r.status === 'rejected').length;
  const totalVolume = receipts
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const summaryCards = [
    { label: 'Pendentes', value: pendingCount, color: colors.warning, bg: colors.accentDim, icon: 'hourglass-outline' as const },
    { label: 'Aprovados', value: approvedCount, color: colors.success, bg: colors.primaryDim, icon: 'checkmark-circle-outline' as const },
    { label: 'Rejeitados', value: rejectedCount, color: colors.destructive, bg: 'rgba(255,69,58,0.12)', icon: 'close-circle-outline' as const },
    { label: 'Volume', value: `${totalVolume.toLocaleString('pt-PT')}`, color: colors.accent, bg: colors.accentDim, icon: 'wallet-outline' as const, isCurrency: true },
  ];

  const statusConfig = (s: string) => {
    if (s === 'approved') return { color: colors.success, bg: 'rgba(52,199,89,0.12)', border: 'rgba(52,199,89,0.3)', icon: 'checkmark-circle' as const, label: 'Aprovado' };
    if (s === 'rejected') return { color: colors.destructive, bg: 'rgba(255,69,58,0.12)', border: 'rgba(255,69,58,0.3)', icon: 'close-circle' as const, label: 'Rejeitado' };
    return { color: colors.warning, bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.3)', icon: 'hourglass' as const, label: 'Pendente' };
  };

  const methodIcon = (m: string) => {
    const lower = m.toLowerCase();
    if (lower.includes('binance')) return 'logo-bitcoin' as const;
    if (lower.includes('rodot') || lower.includes('pay')) return 'card-outline' as const;
    if (lower.includes('express') || lower.includes('multicaixa')) return 'phone-portrait-outline' as const;
    return 'cash-outline' as const;
  };

  const STATUS_FILTERS = [
    { key: 'pending', label: 'Pendente', value: 'pending' },
    { key: 'approved', label: 'Aprovado', value: 'approved' },
    { key: 'rejected', label: 'Rejeitado', value: 'rejected' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.receiptSummaryGrid}>
        {summaryCards.map((s) => (
          <View key={s.label} style={[styles.receiptSummaryCard, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <AppText variant="h1" style={{ color: s.color, fontSize: s.isCurrency ? 16 : 20 }}>{s.value}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>{s.label}</AppText>
          </View>
        ))}
      </View>

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterChips
        filters={STATUS_FILTERS}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, marginBottom: Spacing.md }}>
        <AppText variant="label" style={{ color: colors.textMuted }}>
          {filteredData.length} comprovativ{filteredData.length !== 1 ? 'os' : 'o'}
        </AppText>
        {pendingCount > 0 && (
          <View style={styles.receiptPendingDot}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />
            <AppText variant="small" style={{ color: colors.warning, fontWeight: '600' }}>{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</AppText>
          </View>
        )}
      </View>

      {filteredData.length === 0 ? (
        <EmptyState title={t('admin.noReceipts')} subtitle={t('admin.noReceiptsDesc')} />
      ) : (
        filteredData.map((r) => {
          const st = statusConfig(r.status);
          const isPending = r.status === 'pending';
          const initials = r.user_email?.charAt(0).toUpperCase() ?? '?';
          const createdAt = r.created_at ? new Date(r.created_at) : null;

          return (
            <View key={r.id} style={[styles.receiptNewCard, !isPending && { opacity: 0.6 }]}>
              <View style={[styles.receiptNewAccent, { backgroundColor: st.color }]} />

              <View style={styles.receiptNewContent}>
                <View style={styles.receiptNewTop}>
                  <View style={[styles.receiptNewAvatar, { backgroundColor: `${st.color}20` }]}>
                    <AppText variant="label" style={{ color: st.color, fontWeight: '800' }}>{initials}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={1} style={{ color: isPending ? colors.text : colors.textMuted }}>
                      {r.user_email || r.user_id.slice(0, 12)}
                    </AppText>
                    <AppText variant="small" style={{ color: colors.textFaint }}>
                      {createdAt ? receiptTimeAgo(r.created_at) : '—'}
                      {createdAt && (
                        <AppText variant="small" style={{ color: colors.textFaint }}>
                          {' · '}{createdAt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                        </AppText>
                      )}
                    </AppText>
                  </View>
                  <View style={[styles.receiptStatusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Ionicons name={st.icon} size={12} color={st.color} />
                    <AppText variant="small" style={{ color: st.color, fontWeight: '700' }}>{st.label}</AppText>
                  </View>
                </View>

                {r.duplicate_of ? (
                  <View style={[styles.receiptStatusBadge, { alignSelf: 'flex-start', marginBottom: Spacing.xs, backgroundColor: 'rgba(255,69,58,0.12)', borderColor: 'rgba(255,69,58,0.35)' }]}>
                    <Ionicons name="copy-outline" size={12} color={colors.destructive} />
                    <AppText variant="small" style={{ color: colors.destructive, fontWeight: '700' }}>Possível duplicado</AppText>
                  </View>
                ) : null}

                <View style={styles.receiptInfoGrid}>
                  <View style={styles.receiptInfoCell}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.textFaint} />
                    <View>
                      <AppText variant="small" style={{ color: colors.textFaint, fontSize: 10 }}>PLANO</AppText>
                      <AppText variant="label" style={{ color: colors.text, fontSize: 13 }}>{r.plan}</AppText>
                    </View>
                  </View>
                  <View style={[styles.receiptInfoCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: Spacing.md }]}>
                    <Ionicons name={methodIcon(r.method)} size={13} color={colors.textFaint} />
                    <View>
                      <AppText variant="small" style={{ color: colors.textFaint, fontSize: 10 }}>MÉTODO</AppText>
                      <AppText variant="label" style={{ color: colors.text, fontSize: 13 }}>{r.method}</AppText>
                    </View>
                  </View>
                  <View style={[styles.receiptInfoCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: Spacing.md }]}>
                    <Ionicons name="cash-outline" size={13} color={colors.textFaint} />
                    <View>
                      <AppText variant="small" style={{ color: colors.textFaint, fontSize: 10 }}>VALOR</AppText>
                      <AppText variant="label" style={{ color: colors.accent, fontSize: 13 }}>{r.amount?.toLocaleString('pt-PT')} {r.currency?.toUpperCase()}</AppText>
                    </View>
                  </View>
                </View>

                <View style={styles.receiptNewActions}>
                  <Pressable
                    onPress={() => r.proof_url ? Linking.openURL(r.proof_url) : null}
                    style={styles.receiptActionBtn}
                  >
                    <Ionicons name="image-outline" size={16} color={colors.textMuted} />
                    <AppText variant="small" style={{ color: colors.textMuted }}>Comprovativo</AppText>
                  </Pressable>

                  {isPending ? (
                    <>
                      <Pressable
                        onPress={() => {
                          Alert.alert('Aprovar pagamento?', `${r.user_email} receberá acesso ao plano ${r.plan}.`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Aprovar', onPress: () => handleApprove(r) },
                          ]);
                        }}
                        style={[styles.receiptActionBtn, { backgroundColor: 'rgba(52,199,89,0.12)', borderColor: 'rgba(52,199,89,0.3)' }]}
                        disabled={busyId === r.id}
                      >
                        {busyId === r.id ? (
                          <ActivityIndicator size={14} color={colors.success} />
                        ) : (
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        )}
                        <AppText variant="small" style={{ color: colors.success, fontWeight: '600' }}>Aprovar</AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Alert.alert('Rejeitar pagamento?', `O pagamento de ${r.user_email} será rejeitado.`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Rejeitar', style: 'destructive', onPress: () => handleReject(r) },
                          ]);
                        }}
                        style={[styles.receiptActionBtn, { backgroundColor: 'rgba(255,69,58,0.12)', borderColor: 'rgba(255,69,58,0.3)' }]}
                        disabled={busyId === r.id}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={colors.destructive} />
                        <AppText variant="small" style={{ color: colors.destructive, fontWeight: '600' }}>Rejeitar</AppText>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => {
                        Alert.alert('Eliminar comprovativo?', 'Esta ação não pode ser desfeita.', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(r) },
                        ]);
                      }}
                      style={[styles.receiptActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      disabled={busyId === r.id}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      <AppText variant="small" style={{ color: colors.textMuted }}>Eliminar</AppText>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 2,
  },
  statLabel: { color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginVertical: Spacing.md },
  inlineRow: { flexDirection: 'row', gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  volRow: { marginBottom: Spacing.md },
  volChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeRow: { marginBottom: Spacing.md },
  badgeChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.accentDim,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerRefresh: { padding: Spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: Spacing.xl },
  reportBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  receiptCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  receiptBody: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  receiptDetail: {
    color: colors.textBody,
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  receiptBtn: {
    flexGrow: 1,
    minWidth: 100,
  },
  usersStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  usersStatCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usersFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  usersFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  userCardBanned: {
    opacity: 0.6,
    borderColor: 'rgba(255,69,58,0.3)',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userBannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,69,58,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  userMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textFaint,
  },
  userActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  userRoleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  userRoleChipPremium: {
    backgroundColor: colors.accentDim,
  },
  userExpiryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  userQuickAction: {
    padding: 4,
  },
  receiptSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  receiptSummaryCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptPendingDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  receiptNewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  receiptNewAccent: {
    width: 4,
  },
  receiptNewContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  receiptNewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  receiptNewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  receiptInfoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptInfoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptNewActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
});
