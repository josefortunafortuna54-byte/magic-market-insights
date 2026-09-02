import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { LANGUAGES } from '@/lib/i18n/languages';
import { setLanguage } from '@/lib/i18n';

export default function IdiomaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);

  const onSelect = async (code: string) => {
    if (saving) return;
    if (code === i18n.language) {
      router.back();
      return;
    }
    setSaving(true);
    await setLanguage(code);
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <AppText variant="title" style={styles.headerTitle}>{t('language.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <FlatList
        data={LANGUAGES}
        keyExtractor={(l) => l.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceElevated }]}
            onPress={() => onSelect(item.code)}
            accessibilityRole="button">
            <AppText style={styles.flag}>{item.flag}</AppText>
            <AppText style={styles.name}>{item.nativeName}</AppText>
            {i18n.language === item.code && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm },
  spacer: { width: 26 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
  },
  flag: { fontSize: 22 },
  name: { flex: 1, fontSize: 16, color: c.text },
});
