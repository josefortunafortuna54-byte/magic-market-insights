import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { i18n } from '@/lib/i18n';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = 'google-auth';

function getRedirectTo(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  const scheme = Constants.expoConfig?.scheme ?? 'magictrader';
  return `${scheme}://${REDIRECT_PATH}`;
}

export function getOAuthErrorParams(): { error: string | null } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { error: null };
  const url = new URL(window.location.href);
  const search = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const errorDescription = search.get('error_description') ?? hash.get('error_description');
  const errorCode = search.get('error') ?? hash.get('error_code') ?? hash.get('error');
  if (!errorDescription && !errorCode) return { error: null };
  for (const key of ['error', 'error_code', 'error_description']) search.delete(key);
  url.hash = '';
  window.history.replaceState(window.history.state, '', url.toString());
  return { error: errorDescription ?? errorCode };
}

function extractParamsFromUrl(url: string): URLSearchParams {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams();
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  for (const [key, value] of hashParams) params.set(key, value);
  for (const [key, value] of parsedUrl.searchParams) params.set(key, value);
  return params;
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const redirectTo = getRedirectTo();

    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return { error: error?.message ?? null };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (!data.url) return { error: i18n.t('authErrors.googleStart') };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });
    if (result.type !== 'success') return { error: null };

    const params = extractParamsFromUrl(result.url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) return { error: sessionError.message };
      return { error: null };
    }

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) return { error: exchangeError.message };
      return { error: null };
    }

    return { error: i18n.t('authErrors.googleNotComplete') };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : i18n.t('authErrors.googleError');
    return { error: message };
  }
}
