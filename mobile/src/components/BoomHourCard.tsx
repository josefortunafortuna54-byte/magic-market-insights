import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge } from '@/components/ui';
import { AlarmToggle } from '@/components/AlarmToggle';
import { EconomicEventsRow } from '@/components/EconomicEventBadge';
import { boomCountdown, boomEpochMs } from '@/core/booms';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BoomHour } from '@/core/types';
import type { EconomicEvent } from '../services/economicCalendar';

export type BoomHourStatus = 'live' | 'upcoming' | 'expired';

export function boomHourStatus(hour: BoomHour, now: Date): BoomHourStatus {
  const diff = boomEpochMs(now, hour.time_wat) - now.getTime();
  if (diff <= 0 && diff > -3600_000) return 'live';
  if (diff <= -3600_000) return 'expired';
  return 'upcoming';
}

export function BoomHourCard({ hour, now, news = [] }: { hour: BoomHour; now: Date; news?: EconomicEvent[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const status = boomHourStatus(hour, now);
  const epoch = boomEpochMs(now, hour.time_wat);
  const diff = epoch - now.getTime();

  const accent =
    status === 'live' ? colors.live : status === 'upcoming' ? colors.warning : colors.textFaint;
  const livePct = status === 'live' ? Math.min(100, Math.max(0, (-diff / 3600_000) * 100)) : 0;

  const level = Math.max(0, Math.min(5, Math.round(hour.volatility)));
  const flameColor = level >= 4 ? colors.destructive : level >= 3 ? colors.accent : colors.textFaint;

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.header}>
        <AppText variant="h2" style={{ flex: 1 }}>{hour.title}</AppText>
        {status === 'live' ? (
          <Badge color={colors.live} bg={`${colors.live}1F`}>{t('components.boomHourCard.live')}</Badge>
        ) : status === 'upcoming' ? (
          <Badge color={colors.warning} bg={`${colors.warning}1F`}>{t('components.boomHourCard.upcoming')}</Badge>
        ) : (
          <Badge color={colors.textMuted} bg={`${colors.textMuted}1F`}>{t('components.boomHourCard.closed')}</Badge>
        )}
      </View>

      <View style={styles.timeRow}>
        <AppText variant="mono" style={[styles.timeBig, { color: status === 'live' ? colors.live : colors.accent }]}>
          {hour.time_wat}
        </AppText>
        <View style={{ gap: 1 }}>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.boomHourCard.wat')}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.boomHourCard.gmt', { h: hour.time_gmt })}</AppText>
        </View>
      </View>

      {status === 'live' ? (
        <View style={{ gap: Spacing.xs }}>
          <View style={styles.progressRow}>
            <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.boomHourCard.window')}</AppText>
            <AppText variant="small" style={{ color: colors.live, fontWeight: '700' }}>
              {Math.round(livePct)}%
            </AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${livePct}%`, backgroundColor: colors.live }]} />
          </View>
        </View>
      ) : status === 'upcoming' ? (
        <View style={styles.countdownRow}>
          <AppText variant="mono" style={styles.countdown}>{boomCountdown(new Date(epoch).toISOString())}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.boomHourCard.forEntry')}</AppText>
        </View>
      ) : null}

      <View style={styles.pairs}>
        {(hour.pairs || []).map((p) => (
          <View key={p} style={styles.pairChip}>
            <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>{p}</AppText>
          </View>
        ))}
        {hour.badge ? (
          <View style={styles.badgeChip}>
            <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '700' }}>{hour.badge}</AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.volRow}>
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.boomHourCard.volatility')}</AppText>
        <View style={styles.flames}>
          {level > 0
            ? Array.from({ length: level }).map((_, i) => (
                <Ionicons key={i} name="flame" size={14} color={flameColor} />
              ))
            : <AppText variant="small" style={{ color: colors.textMuted }}>—</AppText>}
        </View>
        <AppText variant="small" style={{ color: colors.textMuted }}>{level}/5</AppText>
      </View>

      {hour.description ? (
        <AppText variant="muted" numberOfLines={2}>{hour.description}</AppText>
      ) : null}

      <EconomicEventsRow events={news} />

      {status === 'expired' ? (
        <AppText variant="small" style={{ color: colors.textFaint }}>{t('components.boomHourCard.closedHint')}</AppText>
      ) : (
        <AlarmToggle
          boomId={hour.id}
          boomTime={new Date(epoch).toISOString()}
          title={hour.title}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  timeBig: { fontSize: 34, lineHeight: 44, fontWeight: '800', fontFamily: 'monospace' },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  countdown: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: c.accent, letterSpacing: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: c.surfaceElevated, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${c.success}1A`,
    borderColor: `${c.success}40`,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeChip: {
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flames: { flexDirection: 'row', gap: 2 },
});
