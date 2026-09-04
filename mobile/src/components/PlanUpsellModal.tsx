import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export function PlanUpsellModal({
  visible,
  what,
  onClose,
}: {
  visible: boolean;
  what: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();

  const openPlans = () => {
    onClose();
    router.push('/planos');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['rgba(255,159,10,0.22)', 'rgba(22,164,58,0.10)', 'transparent']}
            style={styles.glow}
            pointerEvents="none"
          />
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <Ionicons name="diamond" size={24} color={colors.accent} />
          </View>
          <AppText variant="h2" style={styles.title}>
            {t('analises.premiumTitle', { what })}
          </AppText>
          <AppText variant="small" style={styles.subtitle}>
            {t('analises.premiumDesc')}
          </AppText>

          <View style={styles.points}>
            {(
              [
                ['grid-outline', 'analises.upsellPoint1'],
                ['flash-outline', 'analises.upsellPoint2'],
                ['notifications-outline', 'analises.upsellPoint3'],
              ] as const
            ).map(([icon, key]) => (
              <View key={key} style={styles.pointRow}>
                <View style={styles.pointIcon}>
                  <Ionicons name={icon} size={14} color={colors.primary} />
                </View>
                <AppText variant="small" style={styles.pointText}>
                  {t(key)}
                </AppText>
              </View>
            ))}
          </View>

          <AppButton title={t('components.premiumLock.viewPlans')} variant="gold" onPress={openPlans} />
          <AppButton
            title={t('common.notNow')}
            variant="ghost"
            onPress={onClose}
            style={styles.laterBtn}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.62)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xl,
      alignItems: 'center',
      overflow: 'hidden',
    },
    glow: {
      position: 'absolute',
      top: -40,
      left: 0,
      right: 0,
      height: 220,
    },
    handle: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: Spacing.md,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${c.accent}1A`,
      borderWidth: 1,
      borderColor: `${c.accent}55`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    title: { textAlign: 'center' },
    subtitle: {
      color: c.textMuted,
      textAlign: 'center',
      marginTop: Spacing.xs,
      lineHeight: 20,
    },
    points: {
      alignSelf: 'stretch',
      gap: Spacing.sm,
      marginVertical: Spacing.lg,
    },
    pointRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    pointIcon: {
      width: 30,
      height: 30,
      borderRadius: Radius.sm,
      backgroundColor: `${c.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointText: { color: c.textBody, flex: 1 },
    laterBtn: { marginTop: Spacing.xs },
  });
