import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, AppButton } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function ReceiptSuccessModal({ visible, onDone }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scale = useSharedValue(0);
  const ringScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      ringScale.value = 0;
      scale.value = withSpring(1, { damping: 10, stiffness: 150, mass: 0.6 });
      setTimeout(() => {
        ringScale.value = withSpring(1, { damping: 14, stiffness: 100, mass: 0.8 });
      }, 200);
    }
  }, [visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ringScale.value, [0, 1], [0.5, 1]) }],
    opacity: interpolate(ringScale.value, [0, 1], [0, 0.25]),
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.card}>
          <View style={styles.iconArea}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Animated.View style={[styles.iconCircle, iconStyle]}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </Animated.View>
          </View>

          <AppText variant="h1" style={styles.title}>
            {t('planos.receiptOk')}
          </AppText>

          <AppText variant="body" style={styles.subtitle}>
            {t('planos.receiptMsg')}
          </AppText>

          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <AppText variant="small" style={styles.statusText}>
              {t('depositos.statusPendente')}
            </AppText>
          </View>

          <AppText variant="small" style={styles.hint}>
            {t('planos.receiptHint')}
          </AppText>

          <AppButton
            title={t('planos.ok')}
            variant="primary"
            style={styles.btn}
            onPress={onDone}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    iconArea: {
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    ring: {
      position: 'absolute',
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.success,
    },
    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.success,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.success,
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    title: {
      textAlign: 'center',
      fontSize: 20,
    },
    subtitle: {
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: Spacing.sm,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: `${c.warning}15`,
      borderColor: `${c.warning}40`,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    statusText: {
      color: c.warning,
      fontWeight: '700',
    },
    hint: {
      color: c.textFaint,
      textAlign: 'center',
      lineHeight: 18,
    },
    btn: {
      width: '100%',
      minHeight: 50,
      borderRadius: Radius.lg,
      marginTop: Spacing.sm,
    },
  });
