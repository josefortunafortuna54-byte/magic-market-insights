import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { Pulse, Animated, FadeInDown } from '@/lib/animations';

export function PremiumLock({
  label,
  description,
  compact,
}: {
  label: string;
  description?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <View style={styles.card}>
        <Pulse>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={compact ? 18 : 22} color={colors.accent} />
          </View>
        </Pulse>
        <View style={styles.textWrap}>
          <AppText style={styles.title}>{label}</AppText>
          {description ? <AppText variant="muted">{description}</AppText> : null}
        </View>
        <AppButton
          title={t('components.premiumLock.viewPlans')}
          variant="gold"
          onPress={() => router.push('/planos')}
          style={styles.button}
        />
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: `${c.accent}0D`,
      borderColor: `${c.accent}40`,
      borderWidth: 1,
      borderRadius: 16,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: `${c.accent}1F`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: { flex: 1, gap: 2 },
    title: { fontWeight: '700', fontSize: 14 },
    button: { paddingVertical: 10, paddingHorizontal: 14 },
  });
