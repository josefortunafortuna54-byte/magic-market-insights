import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
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
    const accessToken = first(params, 'access_token') ?? hashParams?.get('access_token') ?? undefined;
    const refreshToken = first(params, 'refresh_token') ?? hashParams?.get('refresh_token') ?? undefined;
    const code = first(params, 'code') ?? hashParams?.get('code') ?? undefined;

    (async () => {
      let oauthError: string | null = null;
      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) router.replace('/(tabs)/inicio');
          return;
        }
        oauthError = 'authErrors.googleNotComplete';
      } catch (err) {
        oauthError = err instanceof Error ? err.message : String(err);
      }
      if (!cancelled) {
        router.replace({ pathname: '/(auth)/login', params: oauthError ? { oauthError } : {} });
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
