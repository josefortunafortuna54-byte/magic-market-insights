import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export interface MetricItem {
  label: string;
  value: string;
  accent?: string;
}

export function MetricGrid({ items }: { items: MetricItem[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      {items.map((m) => (
        <View key={m.label} style={styles.item}>
          <AppText variant="h1" style={[styles.value, { color: m.accent ?? colors.text }]} numberOfLines={1}>
            {m.value}
          </AppText>
          <AppText variant="small" style={styles.label}>{m.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  item: {
    flex: 1,
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  value: { fontSize: 18 },
  label: { color: c.textMuted, textAlign: 'center' },
});
