import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Card, Screen } from '@/components/ui';
import { Spacing } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export interface LegalSection {
  title: string;
  body: string;
}

export function LegalDoc({
  title,
  icon,
  intro,
  sections,
  lastUpdate,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  intro?: string;
  sections: LegalSection[];
  lastUpdate?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen>
      <View style={styles.header}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <AppText variant="h1">{title}</AppText>
      </View>
      {intro ? (
        <Card style={styles.intro}>
          <AppText>{intro}</AppText>
        </Card>
      ) : null}

      {sections.map((s, i) => (
        <View key={i} style={styles.section}>
          <AppText variant="h2">{s.title}</AppText>
          <AppText variant="muted" style={styles.body}>{s.body}</AppText>
        </View>
      ))}

      <AppText variant="small" style={{ color: colors.textMuted, marginTop: Spacing.lg }}>
        {t('components.legalDoc.lastUpdated', { date: lastUpdate ?? t('components.legalDoc.january2026') })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  intro: { marginBottom: Spacing.md },
  section: { gap: Spacing.xs, marginBottom: Spacing.md },
  body: { lineHeight: 20 },
});
