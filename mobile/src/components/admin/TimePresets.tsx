import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { TIME_OFFSETS } from '@/core/presets';

interface TimePresetsProps {
  value: number;
  onChange: (minutes: number) => void;
}

export function TimePresets({ value, onChange }: TimePresetsProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>DAQUI A</AppText>
      <View style={styles.row}>
        {TIME_OFFSETS.map((offset) => (
          <Pressable
            key={offset.minutes}
            onPress={() => onChange(offset.minutes)}
            style={[
              styles.chip,
              value === offset.minutes
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: value === offset.minutes ? '#1A1A2E' : colors.textMuted },
              ]}>
              {offset.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { marginBottom: Spacing.md },
    label: { color: c.textMuted, marginBottom: Spacing.sm },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipInactive: { backgroundColor: c.surfaceElevated, borderColor: c.border },
    chipText: { fontWeight: '600' },
  });
