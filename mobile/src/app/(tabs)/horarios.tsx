import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppButton, AppText, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { SectionHeader } from '@/components/SectionHeader';
import { AlarmToggle } from '@/components/AlarmToggle';
import { BoomHourCard, boomHourStatus } from '@/components/BoomHourCard';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { useTheme } from '@/hooks/useTheme';
import {
  DEFAULT_BOOM_PREFS,
  applyBoomPrefs,
  hasActiveFilters,
  loadBoomPrefs,
  type BoomPrefs,
} from '@/lib/boomPrefs';
import { boomCountdown, boomEpochMs, getNextBoomHour } from '@/core/booms';
import { formatLongDate, pad2 } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTourTarget } from '@/components/tour/registry';
import type { BoomHour } from '@/core/types';
import { useTranslation } from 'react-i18next';

function watDate(now: Date): Date {
  return new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
}

function Clock({ now }: { now: Date }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const wat = watDate(now);
  const gmt = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  return (
    <View style={styles.clock}>
      <View style={styles.liveDot} />
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('horarios.watAngola')}</AppText>
        <AppText variant="mono" style={styles.clockValue}>
          {pad2(wat.getHours())}:{pad2(wat.getMinutes())}:{pad2(wat.getSeconds())}
        </AppText>
      </View>
      <View style={styles.divider} />
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('horarios.gmt')}</AppText>
        <AppText variant="mono" style={styles.clockValueMuted}>
          {pad2(gmt.getHours())}:{pad2(gmt.getMinutes())}:{pad2(gmt.getSeconds())}
        </AppText>
      </View>
    </View>
  );
}

function NextBoomHero({ hours, now, planTier }: { hours: BoomHour[]; now: Date; planTier: string }) {
  const { t } = useTranslation();
  const heroRouter = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const next = getNextBoomHour(hours, now);
  if (!next) return null;
  const epoch = boomEpochMs(now, next.time_wat);
  if (epoch < now.getTime()) return null;

  return (
    <GradientCard colors={[colors.accentDim, colors.primaryDim]} style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="small" style={styles.heroEyebrow}>{t('horarios.nextBoom')}</AppText>
          <AppText variant="h2">{next.title}</AppText>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="flame" size={22} color={colors.accent} />
        </View>
      </View>

      <View style={styles.heroTimeRow}>
        <AppText variant="mono" style={styles.heroTime}>{next.time_wat}</AppText>
        <AppText variant="small" style={{ color: colors.textMuted }}>WAT</AppText>
      </View>

      <View style={styles.heroCountdown}>
        <AppText variant="mono" style={styles.heroCd}>
          {boomCountdown(new Date(epoch).toISOString())}
        </AppText>
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('horarios.forEntry')}</AppText>
      </View>

      <View style={styles.pairs}>
        {(next.pairs || []).map((p) => (
          <View key={p} style={styles.pairChip}>
            <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>{p}</AppText>
          </View>
        ))}
      </View>

      {planTier !== 'free' ? (
        <AlarmToggle boomId={next.id} boomTime={new Date(epoch).toISOString()} title={next.title} />
      ) : (
        <Pressable onPress={() => heroRouter.push('/planos')} style={styles.upgradeAlarmBtn}>
          <Ionicons name="lock-closed" size={14} color={colors.accent} />
          <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('components.alarmToggle.activate')}
          </AppText>
        </Pressable>
      )}
    </GradientCard>
  );
}

export default function HorariosScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { planTier } = useSubscription();
  const { hours, loading, error, refetch } = useBoomHours();
  const { newsForBoom } = useEconomicCalendar();
  const [now, setNow] = useState(new Date());
  const [prefs, setPrefs] = useState<BoomPrefs>(DEFAULT_BOOM_PREFS);
  const [refreshing, setRefreshing] = useState(false);
  const titleRef = useTourTarget('tour:horarios-title');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadBoomPrefs(user?.id).then((p) => {
        if (active) setPrefs(p);
      });
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const filteredHours = useMemo(() => applyBoomPrefs(hours, prefs), [hours, prefs]);
  const hiddenCount = Math.max(0, hours.length - filteredHours.length);
  const filtersActive = hasActiveFilters(prefs);

  const live = filteredHours.filter((h) => boomHourStatus(h, now) === 'live');
  const upcoming = filteredHours.filter((h) => boomHourStatus(h, now) === 'upcoming');
  const expired = filteredHours.filter((h) => boomHourStatus(h, now) === 'expired');

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <View ref={titleRef} collapsable={false}>
        <SectionTitle
          right={
            <Pressable onPress={() => router.push('/definicoes-booms')} hitSlop={8}>
              <Ionicons name="settings" size={20} color={colors.textFaint} />
            </Pressable>
          }>
          {t('horarios.title')}
        </SectionTitle>
      </View>

      <View style={styles.dateRow}>
        <AppText variant="label">{formatLongDate(now.toISOString())}</AppText>
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('horarios.watUtc')}</AppText>
      </View>

      <NextBoomHero hours={filteredHours} now={now} planTier={planTier} />

      <Clock now={now} />

      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        {t('horarios.description')}
      </AppText>

      {filtersActive ? (
        <Pressable onPress={() => router.push('/definicoes-booms')} style={styles.filterRow}>
          <Ionicons name="funnel" size={14} color={colors.primary} />
          <AppText variant="small" style={{ color: colors.primary, fontWeight: '600', flex: 1 }}>
            {t('horarios.filtersActive', { count: hiddenCount })}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}

      {loading ? (
        <Spinner label={t('horarios.loading')} />
      ) : error ? (
        <EmptyState title={t('horarios.errorTitle')} subtitle={error} />
      ) : hours.length === 0 ? (
        <EmptyState title={t('horarios.emptyTitle')} subtitle={t('horarios.emptyBody')} />
      ) : filteredHours.length === 0 ? (
        <>
          <EmptyState
            title={t('horarios.noFilteredBooms')}
            subtitle={t('horarios.noFilteredBoomsDesc')}
          />
          <AppButton
            title={t('horarios.adjustFilters')}
            variant="secondary"
            icon={<Ionicons name="options" size={18} color={colors.accent} />}
            onPress={() => router.push('/definicoes-booms')}
          />
        </>
      ) : (
        <View>
          {live.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title={t('horarios.live')} subtitle={`${live.length} janela${live.length > 1 ? 's' : ''} em curso`} />
              {live.map((h) => <BoomHourCard key={h.id} hour={h} now={now} news={newsForBoom(h.time_wat, h.pairs)} />)}
            </View>
          ) : null}
          {upcoming.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title={t('horarios.upcoming')} subtitle="Hoje" />
              {upcoming.map((h) => <BoomHourCard key={h.id} hour={h} now={now} news={newsForBoom(h.time_wat, h.pairs)} />)}
            </View>
          ) : null}
          {expired.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title={t('horarios.closed')} subtitle="Hoje" />
              {expired.map((h) => <BoomHourCard key={h.id} hour={h} now={now} news={newsForBoom(h.time_wat, h.pairs)} />)}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${c.primary}0D`,
    borderColor: `${c.primary}40`,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  hero: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderColor: `${c.accent}55`,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroEyebrow: {
    color: c.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${c.accent}1F`,
    borderColor: `${c.accent}55`,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  heroTime: { fontSize: 44, lineHeight: 56, fontWeight: '800', color: c.accent },
  heroCountdown: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  heroCd: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: c.text, letterSpacing: 1 },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${c.success}1A`,
    borderColor: `${c.success}40`,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.live,
    marginRight: Spacing.md,
  },
  clockCol: { flex: 1, gap: 2 },
  clockValue: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: c.primary },
  clockValueMuted: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: c.textMuted },
  divider: { width: 1, height: 40, backgroundColor: c.border, marginHorizontal: Spacing.md },
  group: { marginBottom: Spacing.lg },
  upgradeAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: `${c.accent}1A`,
    borderColor: `${c.accent}55`,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: Spacing.xs,
  },
});
