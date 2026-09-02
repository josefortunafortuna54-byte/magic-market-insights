import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <AppText variant="small" style={styles.action}>{action.label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    textWrap: { flex: 1, gap: 2 },
    subtitle: { color: c.textMuted },
    action: { color: c.primary, fontWeight: '700' },
  });
