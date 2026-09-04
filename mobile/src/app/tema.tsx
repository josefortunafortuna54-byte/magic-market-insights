import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';

export default function TemaScreen() {
  const { t } = useTranslation();
  const { mode, setMode, colors } = useTheme();
  const styles = makeStyles(colors);

  const options: { value: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: 'system', icon: 'contrast', label: t('theme.system') },
    { value: 'light', icon: 'sunny-outline', label: t('theme.light') },
    { value: 'dark', icon: 'moon-outline', label: t('theme.dark') },
  ];

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
        <AppText variant="title" style={styles.headerTitle}>{t('theme.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <View style={styles.list}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceElevated }]}
            onPress={() => {
              setMode(option.value);
              router.back();
            }}
            accessibilityRole="button">
            <View style={styles.iconWrap}>
              <Ionicons name={option.icon} size={20} color={colors.primary} />
            </View>
            <AppText style={styles.name}>{option.label}</AppText>
            {mode === option.value && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </Pressable>
        ))}
      </View>
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
    iconWrap: { width: 28, alignItems: 'center' },
    name: { flex: 1, fontSize: 16, color: c.text },
  });
