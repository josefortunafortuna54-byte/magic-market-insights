import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface QuickChipsProps {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  selectedValues?: string[];
  onToggle?: (value: string) => void;
}

export function QuickChips({
  label,
  options,
  selected,
  onSelect,
  multiSelect = false,
  selectedValues = [],
  onToggle,
}: QuickChipsProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>{label}</AppText>
      <View style={styles.grid}>
        {options.map((option) => {
          const isActive = multiSelect
            ? selectedValues.includes(option)
            : selected === option;
          return (
            <Pressable
              key={option}
              onPress={() => multiSelect && onToggle ? onToggle(option) : onSelect(option)}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}>
              <AppText
                variant="small"
                style={[
                  styles.chipText,
                  { color: isActive ? '#1A1A2E' : colors.textMuted },
                ]}>
                {option}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { marginBottom: Spacing.md },
    label: { color: c.textMuted, marginBottom: Spacing.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipInactive: { backgroundColor: c.surfaceElevated, borderColor: c.border },
    chipText: { fontWeight: '600' },
  });
