import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { POPULAR_PAIRS } from '@/core/presets';

interface PairChipsProps {
  selected: string;
  onSelect: (pair: string) => void;
}

export function PairChips({ selected, onSelect }: PairChipsProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>PARES RÁPIDOS</AppText>
      <View style={styles.grid}>
        {POPULAR_PAIRS.map((pair) => (
          <Pressable
            key={pair}
            onPress={() => onSelect(pair)}
            style={[
              styles.chip,
              selected === pair
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: selected === pair ? '#1A1A2E' : colors.textMuted },
              ]}>
              {pair}
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
