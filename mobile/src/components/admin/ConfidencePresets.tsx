import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { CONFIDENCE_PRESETS } from '@/core/presets';

interface ConfidencePresetsProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConfidencePresets({ value, onChange }: ConfidencePresetsProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>CONFIANÇA</AppText>
      <View style={styles.row}>
        {CONFIDENCE_PRESETS.map((preset) => (
          <Pressable
            key={preset.value}
            onPress={() => onChange(preset.value)}
            style={[
              styles.chip,
              value === preset.value
                ? { backgroundColor: preset.color, borderColor: preset.color }
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: value === preset.value ? '#1A1A2E' : colors.textMuted },
              ]}>
              {preset.label} ({preset.value}%)
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
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipInactive: { backgroundColor: c.surfaceElevated, borderColor: c.border },
    chipText: { fontWeight: '600' },
  });
