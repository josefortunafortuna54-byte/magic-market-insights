import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Card } from '@/components/ui';
import type { EconomicEvent } from '@/services/economicCalendar';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const makeImpactColors = (c: Palette): Record<string, string> => ({
  high: c.destructive,
  medium: c.warning,
  low: c.textMuted,
  holiday: c.textFaint,
});

function nextEvents(events: EconomicEvent[], count = 3): EconomicEvent[] {
  const sorted = [...events].sort((a, b) => a.time.localeCompare(b.time));
  const nowKey = new Date().toTimeString().slice(0, 5);
  const upcoming = sorted.filter((e) => e.time >= nowKey);
  return (upcoming.length ? upcoming : sorted).slice(0, count);
}

export function NewsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { today, loading } = useEconomicCalendar();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const impactColors = makeImpactColors(colors);

  const events = useMemo(() => nextEvents(today), [today]);

  if (!loading && events.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Ionicons name="newspaper" size={16} color={colors.accent} />
          <AppText variant="label">{t('inicio.newsTitle')}</AppText>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/horarios')} hitSlop={8}>
          <AppText variant="small" style={styles.viewAll}>{t('inicio.viewAll')}</AppText>
        </Pressable>
      </View>

      {loading ? (
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('inicio.newsLoading')}</AppText>
      ) : (
        <View style={styles.list}>
          {events.map((ev) => (
            <Pressable
              key={`${ev.date}-${ev.time}-${ev.event}`}
              onPress={() => router.push('/(tabs)/horarios')}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <View style={[styles.dot, { backgroundColor: impactColors[ev.impact] ?? colors.textMuted }]} />
              <View style={[styles.currencyChip, { borderColor: `${impactColors[ev.impact] ?? colors.textMuted}55` }]}>
                <AppText variant="small" style={{ color: colors.textBody, fontWeight: '800' }}>{ev.currency}</AppText>
              </View>
              <AppText variant="small" style={styles.event} numberOfLines={1}>{ev.event}</AppText>
              <AppText variant="mono" style={styles.time}>{ev.time}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewAll: {
    color: c.primary,
    fontWeight: '700',
  },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currencyChip: {
    minWidth: 44,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  event: {
    flex: 1,
    color: c.textBody,
  },
  time: {
    color: c.textMuted,
    fontSize: 12,
  },
});
