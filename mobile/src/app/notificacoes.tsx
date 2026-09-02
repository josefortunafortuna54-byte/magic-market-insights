import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton, AppText, Badge, Card, EmptyState, Screen, Spinner } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  clearPlanRequests,
  getPlanRequests,
  pruneExpiredPlanRequests,
  removePlanRequest,
  type PlanRequestEntry,
} from '@/lib/planRequests';
import {
  clearUserNotifications,
  deleteUserNotification,
  fetchUserNotifications,
  markAllUserNotificationsRead,
} from '@/lib/userNotifications';
import { pad2 } from '@/core/format';
import { Animated, FadeInDown, FadeInUp, Layout } from '@/lib/animations';

interface NotifItem {
  identifier: string;
  title: string;
  body: string;
  fireAt: Date | null;
  createdAt?: Date;
  kind: 'boom' | 'plan' | 'signal' | 'other';
  source: 'remote' | 'plan-request' | 'local';
  unread: boolean;
}

type Group = 'today' | 'week' | 'earlier';

function getFireDate(trigger: Notifications.NotificationTrigger): Date | null {
  if (!trigger || typeof trigger !== 'object') return null;
  if ('type' in trigger && trigger.type === 'date' && 'date' in trigger) {
    return new Date(trigger.date);
  }
  return null;
}

function kindOf(item: { title: string | null; data?: unknown }): NotifItem['kind'] {
  const d = item.data as { kind?: unknown } | undefined;
  if (d?.kind === 'plan') return 'plan';
  if (!item.title) return 'other';
  if (/boom|alarme/i.test(item.title)) return 'boom';
  if (/premium|plano|oferta|pedido/i.test(item.title)) return 'plan';
  if (/sinal|signal|\btp\b|\bsl\b/i.test(item.title)) return 'signal';
  return 'other';
}

function itemDate(item: NotifItem): Date {
  return item.createdAt ?? item.fireAt ?? new Date(0);
}

function groupOf(item: NotifItem): Group {
  const d = itemDate(item);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d >= startOfToday) return 'today';
  const weekAgo = startOfToday.getTime() - 6 * 86_400_000;
  if (d.getTime() >= weekAgo) return 'week';
  return 'earlier';
}

function relativeTime(d: Date, t: TFunction): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return t('notificacoes.justNow');
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return t('notificacoes.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notificacoes.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notificacoes.daysAgo', { count: days });
}

function formatFire(fireAt: Date | null, t: TFunction): string {
  if (!fireAt) return t('notificacoes.soon');
  const diff = fireAt.getTime() - Date.now();
  if (diff <= 0) return t('notificacoes.delivered');
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return t('notificacoes.inMin', { count: mins });
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return t('notificacoes.inHm', { h: hh, min: mm });
}

const KIND_STYLE = (c: Palette): Record<NotifItem['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
  boom: { icon: 'flame', color: c.accent },
  signal: { icon: 'flash', color: c.success },
  plan: { icon: 'sparkles', color: c.primary },
  other: { icon: 'notifications-outline', color: c.textMuted },
});

const GROUP_LABEL: Record<Group, 'notificacoes.today' | 'notificacoes.thisWeek' | 'notificacoes.earlier'> = {
  today: 'notificacoes.today',
  week: 'notificacoes.thisWeek',
  earlier: 'notificacoes.earlier',
};

const GROUP_ORDER: Group[] = ['today', 'week', 'earlier'];

export default function NotificacoesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (): Promise<NotifItem[]> => {
    await pruneExpiredPlanRequests().catch(() => {});
    const [scheduled, planRequests, remote] = await Promise.all([
      Notifications.getAllScheduledNotificationsAsync(),
      getPlanRequests().catch(() => [] as PlanRequestEntry[]),
      fetchUserNotifications(30).catch(() => []),
    ]);
    const scheduledItems: NotifItem[] = scheduled.map((n) => ({
      identifier: n.identifier,
      title: n.content.title ?? t('notificacoes.title'),
      body: n.content.body ?? '',
      fireAt: getFireDate(n.trigger),
      kind: kindOf(n.content),
      source: 'local',
      unread: false,
    }));
    const planItems: NotifItem[] = planRequests.map((p) => ({
      identifier: p.id,
      title: p.title,
      body: p.body,
      fireAt: null,
      createdAt: new Date(p.createdAt),
      kind: 'plan',
      source: 'plan-request',
      unread: false,
    }));
    const remoteItems: NotifItem[] = remote.map((n) => ({
      identifier: n.id,
      title: n.title,
      body: n.body,
      fireAt: null,
      createdAt: new Date(n.created_at),
      kind: kindOf({ title: n.title, data: { kind: n.kind } }),
      source: 'remote',
      unread: !n.read,
    }));
    return [...remoteItems, ...planItems, ...scheduledItems].sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? b.fireAt?.getTime() ?? Infinity) -
        (a.createdAt?.getTime() ?? a.fireAt?.getTime() ?? Infinity),
    );
  }, [t]);

  useEffect(() => {
    load().then(setItems).catch(() => setItems([]));
    // O sino conta como lido ao abrir a caixa de entrada — mas com um
    // pequeno delay para os pontos "por ler" ficarem visíveis.
    markReadTimer.current = setTimeout(() => {
      markAllUserNotificationsRead().catch(() => {});
      setItems((prev) =>
        prev ? prev.map((i) => (i.source === 'remote' ? { ...i, unread: false } : i)) : prev,
      );
    }, 2500);
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await load());
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const remove = async (identifier: string) => {
    setBusyId(identifier);
    try {
      const item = items?.find((i) => i.identifier === identifier);
      if (item?.source === 'remote') {
        await deleteUserNotification(identifier).catch(() => {});
      } else if (identifier.startsWith('plan-request-')) {
        await removePlanRequest(identifier);
      } else {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  const clearAll = async () => {
    setBusyId('all');
    try {
      await Promise.all([
        Notifications.cancelAllScheduledNotificationsAsync(),
        clearPlanRequests().catch(() => {}),
        clearUserNotifications().catch(() => {}),
      ]);
      setItems(await load());
    } finally {
      setBusyId(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<Group, NotifItem[]>();
    for (const item of items ?? []) {
      const g = groupOf(item);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    let idx = 0;
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!.map((item) => ({ item, delay: idx++ * 45 })),
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
    <Screen scroll={false}>
      {items === null ? (
        <Spinner label={t('notificacoes.loading')} />
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyWrap}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }>
          <View style={styles.emptyArt}>
            <Ionicons name="notifications-off-outline" size={44} color={colors.textFaint} />
          </View>
          <EmptyState
            title={t('notificacoes.emptyTitle')}
            subtitle={t('notificacoes.emptyBody')}
          />
          <AppButton
            title={t('notificacoes.enableAlarms')}
            variant="secondary"
            icon={<Ionicons name="alarm-outline" size={18} color={colors.accent} />}
            onPress={() => router.push('/(tabs)/horarios')}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }>
          <GradientCard colors={[`${colors.primary}26`, `${colors.accent}14`]} style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
              {unreadCount > 0 ? <View style={styles.summaryDot} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t('notificacoes.summaryTitle')}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {unreadCount > 0
                  ? t('notificacoes.unreadCount', { count: unreadCount })
                  : t('notificacoes.allRead')}
                {scheduledCount > 0 ? ` · ${scheduledCount} ⏰` : ''}
              </AppText>
            </View>
            <Pressable onPress={clearAll} disabled={busyId === 'all'} hitSlop={8} style={styles.clearChip}>
              <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
              <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '600' }}>
                {t('notificacoes.clearAll')}
              </AppText>
            </Pressable>
          </GradientCard>

          {grouped.map(({ group, items: groupItems }) => (
            <Animated.View key={group} entering={FadeInDown.duration(300)} layout={Layout.springify()}>
              <AppText variant="small" style={styles.groupLabel}>
                {t(GROUP_LABEL[group]).toUpperCase()}
              </AppText>
              <View style={styles.groupList}>
                {groupItems.map(({ item, delay }) => {
                  const s = KIND_STYLE(colors)[item.kind];
                  const busy = busyId === item.identifier;
                  const isPendingPlan = item.source === 'plan-request';
                  const date = itemDate(item);
                  const meta = isPendingPlan
                    ? t('notificacoes.planProcessing')
                    : item.fireAt && item.fireAt.getTime() > now
                      ? t('notificacoes.scheduledFor', {
                          time: `${pad2(item.fireAt.getHours())}:${pad2(item.fireAt.getMinutes())}`,
                        })
                      : item.createdAt
                        ? relativeTime(date, t)
                        : formatFire(item.fireAt, t);
                  return (
                    <Animated.View key={item.identifier} entering={FadeInUp.delay(delay).springify()} layout={Layout.springify()}>
                      <Card style={[styles.row, item.unread && styles.rowUnread]}>
                        <View style={[styles.iconWrap, { borderColor: `${s.color}40`, backgroundColor: `${s.color}14` }]}>
                          <Ionicons name={s.icon} size={19} color={s.color} />
                          {item.unread ? <View style={[styles.unreadDot, { backgroundColor: s.color }]} /> : null}
                        </View>
                        <View style={styles.rowBody}>
                          <View style={styles.rowTitleLine}>
                            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                              {item.title}
                            </AppText>
                            {!isPendingPlan && item.source !== 'remote' && item.fireAt ? (
                              <Badge color={colors.warning} bg={`${colors.warning}1F`}>⏰</Badge>
                            ) : null}
                          </View>
                          {item.body ? (
                            <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={2}>
                              {item.body}
                            </AppText>
                          ) : null}
                          <AppText variant="small" style={{ color: colors.textFaint }}>
                            {meta}
                          </AppText>
                        </View>
                        {isPendingPlan ? (
                          <Badge color={colors.warning} bg={`${colors.warning}20`}>
                            {t('notificacoes.planPending')}
                          </Badge>
                        ) : (
                          <Pressable onPress={() => remove(item.identifier)} disabled={busy} hitSlop={10} style={styles.trashBtn}>
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color={busy ? colors.textFaint : colors.textMuted}
                            />
                          </Pressable>
                        )}
                      </Card>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          ))}

          <AppButton
            title={t('notificacoes.manageAlerts')}
            variant="secondary"
            icon={<Ionicons name="alarm-outline" size={18} color={colors.accent} />}
            onPress={() => router.push('/(tabs)/horarios')}
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  emptyArt: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${c.primary}1F`,
    borderColor: `${c.primary}55`,
    borderWidth: 1,
  },
  summaryDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: c.destructive,
    borderColor: c.bg,
    borderWidth: 1.5,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
  },
  groupLabel: {
    color: c.textFaint,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  groupList: { gap: Spacing.sm, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    overflow: 'hidden',
  },
  rowUnread: { borderColor: `${c.primary}55` },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderColor: c.bg,
    borderWidth: 2,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  trashBtn: { padding: 4 },
});
