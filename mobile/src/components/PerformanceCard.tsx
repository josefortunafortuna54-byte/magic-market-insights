import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { MetricGrid } from '@/components/MetricGrid';
import { formatPips } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { HistoryStats } from '@/core/types';
import { Animated, AnimatedPressable, FadeInUp } from '@/lib/animations';

export function PerformanceCard({
  stats,
  activeCount,
  loading,
  onPress,
}: {
  stats: HistoryStats;
  activeCount: number;
  loading: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const total = stats.total || 0;
  const tpPct = total > 0 ? Math.round((stats.tp / total) * 100) : 0;
  const slPct = total > 0 ? Math.round((stats.sl / total) * 100) : 0;

  return (
    <Animated.View entering={FadeInUp.delay(100).springify()}>
      <AnimatedPressable onPress={onPress}>
        <GradientCard
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          style={styles.card}>
          <View style={styles.header}>
            <AppText variant="small" style={styles.eyebrow}>{t('components.performanceCard.title')}</AppText>
            <AppText variant="small" style={styles.link}>{t('components.performanceCard.viewHistory')}</AppText>
          </View>

          <View style={styles.winRow}>
            <AppText variant="title" style={styles.win}>
              {loading ? '—' : `${stats.winRate}%`}
            </AppText>
            <AppText variant="muted" style={styles.winLabel}>{t('components.performanceCard.winRate')}</AppText>
          </View>

          <View style={styles.bars}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { backgroundColor: colors.success, width: `${tpPct}%` }]} />
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { backgroundColor: colors.destructive, width: `${slPct}%` }]} />
            </View>
          </View>
          <View style={styles.barLegend}>
            <AppText variant="small" style={{ color: colors.success }}>{t('components.performanceCard.tp', { pct: tpPct })}</AppText>
            <AppText variant="small" style={{ color: colors.destructive }}>{t('components.performanceCard.sl', { pct: slPct })}</AppText>
          </View>

          <MetricGrid
            items={[
              { label: t('components.performanceCard.totalPips'), value: loading ? '—' : formatPips(stats.totalPips), accent: colors.accent },
              { label: t('components.performanceCard.totalSignals'), value: loading ? '—' : String(stats.total) },
              { label: t('components.performanceCard.activeNow'), value: String(activeCount), accent: activeCount > 0 ? colors.success : undefined },
            ]}
          />
        </GradientCard>
      </AnimatedPressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { marginBottom: Spacing.lg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    eyebrow: { color: c.textMuted, fontWeight: '700', letterSpacing: 1 },
    link: { color: c.textMuted },
    winRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    win: { fontSize: 48, lineHeight: 52 },
    winLabel: { flex: 1 },
    bars: { gap: 6, marginBottom: Spacing.sm },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3 },
    barLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
  });
