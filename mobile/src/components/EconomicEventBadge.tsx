import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { IMPACT_COLORS, type EconomicEvent, type ImpactLevel } from '../services/economicCalendar';

const ICON_MAP: Record<ImpactLevel, keyof typeof Ionicons.glyphMap> = {
  high: 'alert-circle',
  medium: 'warning',
  low: 'information-circle',
  holiday: 'calendar',
};

export function EconomicEventBadge({ event }: { event: EconomicEvent }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = IMPACT_COLORS[event.impact] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <Ionicons name={ICON_MAP[event.impact]} size={13} color={color} />
      <View style={styles.textCol}>
        <AppText variant="small" style={[styles.event, { color }]}>
          {event.currency} — {event.event}
        </AppText>
        <AppText variant="small" style={{ color: colors.textMuted, fontSize: 10 }}>{event.time}</AppText>
      </View>
      {event.forecast ? (
        <View style={styles.valCol}>
          <AppText variant="small" style={{ color: colors.textMuted, fontSize: 10 }}>F</AppText>
          <AppText variant="small" style={{ color: colors.textFaint, fontSize: 10 }}>{event.forecast}</AppText>
        </View>
      ) : null}
      {event.actual ? (
        <View style={styles.valCol}>
          <AppText variant="small" style={{ color: colors.textMuted, fontSize: 10 }}>A</AppText>
          <AppText variant="small" style={{ color, fontSize: 10 }}>{event.actual}</AppText>
        </View>
      ) : null}
    </View>
  );
}

export function EconomicEventsRow({ events }: { events: EconomicEvent[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!events.length) return null;
  return (
    <View style={styles.section}>
      <AppText variant="small" style={styles.sectionTitle}>
        <Ionicons name="newspaper-outline" size={12} color={colors.textMuted} />{'  '}Notícias Económicas
      </AppText>
      {events.map((e, i) => (
        <EconomicEventBadge key={`${e.currency}-${e.event}-${i}`} event={e} />
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  section: { gap: Spacing.xs },
  sectionTitle: { color: c.textMuted, fontWeight: '600', marginBottom: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  textCol: { flex: 1, gap: 1 },
  event: { fontWeight: '600', fontSize: 12 },
  valCol: { alignItems: 'center', gap: 1, marginLeft: Spacing.xs },
});
