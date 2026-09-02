import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { requestWhatsAppCode, verifyWhatsAppCode } from '@/lib/whatsappAuth';
import { Trans, useTranslation } from 'react-i18next';

const WA_GREEN = '#25D366';

type Step = 'phone' | 'code';

export default function WhatsappScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentPhone, setSentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;

  const normalizedPhone = () => phone.replace(/\D/g, '');

  const sendCode = async () => {
    const digits = normalizedPhone();
    if (digits.length < 8 || digits.length > 15) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await requestWhatsAppCode(`+${digits}`);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSentPhone(`+${digits}`);
    setStep('code');
  };

  const verify = async () => {
    if (code.trim().length !== 6) {
      setError(t('auth.codeInvalid'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await verifyWhatsAppCode(sentPhone, code.trim());
    setLoading(false);
    if (err) setError(err);
  };

  const fadeSlide = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
    ],
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} style={styles.bg}>
      <View pointerEvents="none" style={styles.aura} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.container}>
          <Animated.View style={[styles.header, fadeSlide]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
            </Pressable>
            <View style={styles.logoGlow}>
              <Ionicons name="logo-whatsapp" size={44} color={WA_GREEN} />
            </View>
            <AppText variant="title" style={styles.logo}>{t('auth.enterWhatsapp')}</AppText>
            <AppText variant="muted" style={styles.tagline}>
              {step === 'phone' ? t('auth.whatsappPrompt') : t('auth.codeSent', { phone: sentPhone })}
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.formCard, fadeSlide]}>
            {step === 'phone' ? (
              <AppInput
                label={t('auth.phoneLabel')}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phonePlaceholder')}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="done"
                onSubmitEditing={sendCode}
                icon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />}
              />
            ) : (
              <>
                <AppInput
                  label={t('auth.codeLabel')}
                  value={code}
                  onChangeText={setCode}
                  placeholder={t('auth.codePlaceholder')}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={verify}
                  icon={<Ionicons name="keypad-outline" size={18} color={colors.textMuted} />}
                />
                <Pressable onPress={sendCode} disabled={loading} hitSlop={8}>
                  <AppText variant="small" style={styles.resend}>{t('auth.resendCode')}</AppText>
                </Pressable>
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : null}

            <AppButton
              title={step === 'phone' ? t('auth.sendCode') : t('auth.verifyCode')}
              onPress={step === 'phone' ? sendCode : verify}
              loading={loading}
              icon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
            />
          </Animated.View>

          <Animated.View style={[styles.footer, fadeSlide]}>
            <AppText variant="small" style={styles.legal}>
              <Trans
                t={t}
                components={{
                  termsLink: <Link href="/termos" style={{ color: colors.primary }} />,
                  privacyLink: <Link href="/privacidade" style={{ color: colors.primary }} />,
                }}>
                {`${t('auth.legalFooterBefore')}<termsLink>${t('auth.legalTerms')}</termsLink>${t('auth.legalFooterAfter')}<privacyLink>${t('auth.legalPrivacy')}</privacyLink>.`}
              </Trans>
            </AppText>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: Spacing.lg },
  aura: {
    position: 'absolute',
    top: -160,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(37,211,102,0.06)',
  },
  header: { gap: Spacing.sm, alignItems: 'center' },
  back: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: Spacing.xs,
  },
  logoGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(37,211,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.30)',
    marginBottom: Spacing.sm,
  },
  logo: { color: c.text, letterSpacing: 0.5, textAlign: 'center' },
  tagline: { textAlign: 'center' },
  formCard: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  resend: {
    color: c.primary,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: Spacing.xs,
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
  footer: { alignItems: 'center' },
  legal: { color: c.textMuted, textAlign: 'center', paddingHorizontal: Spacing.md },
});
