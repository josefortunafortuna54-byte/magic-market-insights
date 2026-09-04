import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export function WorkspaceSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.title}>{title}</AppText>
        {right}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    section: { marginBottom: Spacing.lg, gap: Spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: c.textFaint, letterSpacing: 1.2 },
    body: { gap: Spacing.sm },
  });
