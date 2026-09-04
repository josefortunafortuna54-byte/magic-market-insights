import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { signInWithGoogle } from '@/lib/googleAuth';
import { useAuth } from '@/hooks/useAuth';
import { Trans, useTranslation } from 'react-i18next';

const WA_GREEN = '#25D366';
const GOOGLE_BLUE = '#4285F4';
const GOOGLE_RED = '#EA4335';
const GOOGLE_YELLOW = '#FBBC05';
const GOOGLE_GREEN = '#34A853';

const fadeSlide = (value: Animated.Value, fromY = 24) => ({
  opacity: value,
  transform: [
    {
      translateY: value.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }),
    },
  ],
});

function GoogleG() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.gLogo} pointerEvents="none">
      <View style={[styles.gBar, { top: 0, right: 0, width: 22, height: 7, backgroundColor: GOOGLE_RED, borderTopRightRadius: 5 }]} />
      <View style={[styles.gBar, { bottom: 0, left: 0, width: 22, height: 7, backgroundColor: GOOGLE_YELLOW, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }]} />
      <View style={[styles.gBar, { right: 0, top: 7, width: 7, height: 7, backgroundColor: GOOGLE_GREEN, borderTopRightRadius: 5 }]} />
      <View style={[styles.gBar, { right: 0, top: 14, width: 13, height: 7, backgroundColor: GOOGLE_GREEN, borderTopLeftRadius: 4 }]} />
      <View style={[styles.gBar, { left: 0, top: 0, width: 7, height: 22, backgroundColor: GOOGLE_BLUE, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }]} />
    </View>
  );
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { oauthError } = useLocalSearchParams<{ oauthError?: string }>();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(oauthError ?? null);

  const [formAnim] = useState(() => new Animated.Value(0));
  const [propsAnim] = useState(() => new Animated.Value(0));
  const [footerAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(propsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [formAnim, propsAnim, footerAnim]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;

  const loginGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) setError(error);
  };

  const points = [
    { icon: 'flash-outline', label: t('auth.value1') },
    { icon: 'notifications-outline', label: t('auth.value2') },
    { icon: 'pie-chart-outline', label: t('auth.value3') },
  ] as const;

  return (
    <View style={styles.bg}>
      <LinearGradient
        colors={['rgba(7,7,15,0.50)', 'rgba(6,6,14,0.72)', 'rgba(4,4,10,0.94)']}
        style={StyleSheet.absoluteFill}>
        <Image
          source={require('@/assets/images/bg-login.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
        <View pointerEvents="none" style={styles.aura} />
        <View pointerEvents="none" style={styles.auraBottom} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                  <AppText style={styles.errorText}>{error}</AppText>
                </View>
              ) : null}

              <Pressable
                onPress={loginGoogle}
                disabled={googleLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.continueGoogle')}
                style={({ pressed }) => [
                  styles.googleBtn,
                  (pressed || googleLoading) && { opacity: googleLoading ? 0.7 : 0.88 },
                ]}>
                {googleLoading ? (
                  <ActivityIndicator color="#1A1A1E" />
                ) : (
                  <>
                    <GoogleG />
                    <AppText style={styles.googleBtnText}>{t('auth.continueGoogle')}</AppText>
                  </>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <AppText variant="small" style={styles.dividerText}>{t('auth.or')}</AppText>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => router.push('/(auth)/whatsapp')}
                accessibilityRole="button"
                accessibilityLabel={t('auth.enterWhatsapp')}
                style={({ pressed }) => [styles.waBtn, pressed && { opacity: 0.85 }]}>
                <Ionicons name="logo-whatsapp" size={20} color={WA_GREEN} />
                <AppText style={styles.waBtnText}>{t('auth.enterWhatsapp')}</AppText>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.pointsRow, fadeSlide(propsAnim)]}>
              {points.map((p) => (
                <View key={p.label} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <Ionicons name={p.icon} size={16} color={colors.primary} />
                  </View>
                  <AppText variant="small" style={styles.pointText}>{p.label}</AppText>
                </View>
              ))}
            </Animated.View>

            <Animated.View style={[styles.footer, fadeSlide(footerAnim, 24)]}>
              <AppText variant="small" style={styles.legal}>
                <Trans
                  t={t}
                  components={{
                    termsLink: <Link href="/termos" style={{ color: colors.primary, fontWeight: '700' }} />,
                    privacyLink: <Link href="/privacidade" style={{ color: colors.primary, fontWeight: '700' }} />,
                  }}>
                  {`${t('auth.legalFooterBefore')}<termsLink>${t('auth.legalTerms')}</termsLink>${t('auth.legalFooterAfter')}<privacyLink>${t('auth.legalPrivacy')}</privacyLink>.`}
                </Trans>
              </AppText>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  bg: { flex: 1 },
  bgLogo: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 150, gap: Spacing.lg },
  aura: {
    position: 'absolute',
    top: -160,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(22,164,58,0.09)',
  },
  auraBottom: {
    position: 'absolute',
    bottom: -200,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,159,10,0.05)',
  },
  formCard: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { color: c.destructive, flex: 1, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  googleBtnText: {
    color: '#1A1A1E',
    fontSize: 16,
    fontWeight: '600',
  },
  gLogo: { width: 22, height: 22 },
  gBar: { position: 'absolute' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  dividerText: {
    color: c.textMuted,
    letterSpacing: 1,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(37,211,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.40)',
  },
  waBtnText: {
    color: WA_GREEN,
    fontSize: 16,
    fontWeight: '700',
  },
  pointsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  point: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  pointIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(22,164,58,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    color: c.textMuted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  footer: { alignItems: 'center' },
  legal: { color: c.textMuted, textAlign: 'center', paddingHorizontal: Spacing.md },
});
