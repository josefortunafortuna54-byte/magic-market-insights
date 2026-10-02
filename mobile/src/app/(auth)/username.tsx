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
import { createAccountWithUsername, signInWithUsername } from '@/lib/usernameAuth';
import { isValidUsername } from '@/lib/usernameRules';
import { Trans, useTranslation } from 'react-i18next';

type Mode = 'signin' | 'create';

const MIN_PASSWORD = 8;

export default function UsernameScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const normalized = username.trim().toLowerCase();

  const submit = async () => {
    if (!isValidUsername(normalized)) {
      setError(t('auth.usernameInvalid'));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t('authErrors.passwordTooShort'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } =
      mode === 'signin'
        ? await signInWithUsername(normalized, password)
        : await createAccountWithUsername(normalized, password);
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
        <KeyboardAvoidingView behavior="padding" style={styles.container}>
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
              <Ionicons name="person-circle-outline" size={44} color={colors.primary} />
            </View>
            <AppText variant="title" style={styles.logo}>
              {mode === 'signin' ? t('auth.usernameSignInTitle') : t('auth.usernameCreateTitle')}
            </AppText>
            <AppText variant="muted" style={styles.tagline}>
              {t('auth.usernamePrompt')}
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.formCard, fadeSlide]}>
            <AppInput
              label={t('auth.usernameLabel')}
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              icon={<Ionicons name="at-outline" size={18} color={colors.textMuted} />}
            />
            <AppInput
              label="SENHA"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              returnKeyType="done"
              onSubmitEditing={submit}
              icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : null}

            <AppButton
              title={mode === 'signin' ? t('auth.signInWithUsername') : t('auth.createWithUsername')}
              onPress={submit}
              loading={loading}
              icon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
            />

            <Pressable
              onPress={() => {
                setMode(mode === 'signin' ? 'create' : 'signin');
                setError(null);
              }}
              hitSlop={8}>
              <AppText variant="small" style={styles.switch}>
                {mode === 'signin' ? t('auth.usernameNoAccount') : t('auth.usernameHasAccount')}
              </AppText>
            </Pressable>
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
      backgroundColor: 'rgba(34,197,94,0.06)',
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
    switch: {
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
