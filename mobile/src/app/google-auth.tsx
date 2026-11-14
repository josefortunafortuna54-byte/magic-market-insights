import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { createSessionFromUrl, getRedirectTo } from '@/lib/googleAuth';
import { i18n } from '@/lib/i18n';
import { type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

function first(params: Record<string, string | string[]>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default function GoogleAuthRedirectScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    let cancelled = false;

    const hash = first(params, '#');
    const hashParams = hash ? new URLSearchParams(hash) : null;
    const callback = new URLSearchParams();
    for (const key of ['code', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description']) {
      const value = first(params, key) ?? hashParams?.get(key) ?? undefined;
      if (value) callback.set(key, value);
    }

    (async () => {
      try {
        const { data: current } = await supabase.auth.getSession();
        if (current.session) {
          if (!cancelled) router.replace('/(tabs)/inicio');
          return;
        }

        const { error } = await createSessionFromUrl(`${getRedirectTo()}?${callback.toString()}`);

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data.session) {
            router.replace('/(tabs)/inicio');
          } else {
            router.replace({
              pathname: '/(auth)/login',
              params: { oauthError: error ?? i18n.t('authErrors.googleNotComplete') },
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          router.replace({
            pathname: '/(auth)/login',
            params: { oauthError: err instanceof Error ? err.message : i18n.t('authErrors.googleError') },
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg,
  },
});
