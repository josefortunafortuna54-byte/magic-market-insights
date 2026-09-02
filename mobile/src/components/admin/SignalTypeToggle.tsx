import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

type SignalType = 'BUY' | 'SELL';

interface SignalTypeToggleProps {
  value: SignalType;
  onChange: (type: SignalType) => void;
}

export function SignalTypeToggle({ value, onChange }: SignalTypeToggleProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>TIPO</AppText>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange('BUY')}
          style={[
            styles.chip,
            value === 'BUY' ? styles.buyActive : styles.chipInactive,
          ]}>
          <AppText
            variant="small"
            style={[
              styles.chipText,
              { color: value === 'BUY' ? '#1A1A2E' : colors.textMuted },
            ]}>
            📈 BUY
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onChange('SELL')}
          style={[
            styles.chip,
            value === 'SELL' ? styles.sellActive : styles.chipInactive,
          ]}>
          <AppText
            variant="small"
            style={[
              styles.chipText,
              { color: value === 'SELL' ? '#1A1A2E' : colors.textMuted },
            ]}>
            📉 SELL
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { marginBottom: Spacing.md },
    label: { color: c.textMuted, marginBottom: Spacing.sm },
    row: { flexDirection: 'row', gap: Spacing.sm },
    chip: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    buyActive: { backgroundColor: c.success, borderColor: c.success },
    sellActive: { backgroundColor: c.destructive, borderColor: c.destructive },
    chipInactive: { backgroundColor: c.surfaceElevated, borderColor: c.border },
    chipText: { fontWeight: '700' },
  });
