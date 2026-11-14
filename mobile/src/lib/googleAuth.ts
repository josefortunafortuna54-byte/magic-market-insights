import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { i18n } from '@/lib/i18n';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = 'google-auth';

export function getRedirectTo(): string {
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

function decodeParamValue(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw;
  }
}

export function parseOAuthCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const collect = (section: string) => {
    for (const pair of section.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = decodeParamValue(eq === -1 ? pair : pair.slice(0, eq));
      if (key in params) continue;
      params[key] = decodeParamValue(eq === -1 ? '' : pair.slice(eq + 1));
    }
  };
  let base = url;
  const hashIndex = base.indexOf('#');
  let fragment = '';
  if (hashIndex !== -1) {
    fragment = base.slice(hashIndex + 1);
    base = base.slice(0, hashIndex);
  }
  const queryIndex = base.indexOf('?');
  if (queryIndex !== -1) {
    collect(base.slice(queryIndex + 1));
  }
  collect(fragment);
  return params;
}

function oauthErrorMessage(params: Record<string, string>): string | null {
  const description = params.error_description ?? params.errorDescription;
  const code = params.error_code ?? params.errorCode;
  const error = params.error;
  if (error === 'access_denied' || code === 'access_denied') {
    return i18n.t('authErrors.googleNotComplete');
  }
  return description ?? code ?? error ?? null;
}

const pendingCodeExchanges = new Map<string, Promise<{ error: string | null }>>();

async function exchangeAuthCode(code: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return { error: null };
    const { data } = await supabase.auth.getSession();
    return { error: data.session ? null : error.message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : i18n.t('authErrors.googleError') };
  }
}

/**
 * Completes the OAuth session from a callback URL. Handles both the PKCE
 * (`?code=`) and implicit (`#access_token=`) callback formats. On Android the
 * same callback deep link reaches both the pending `signInWithGoogle` promise
 * and the `/google-auth` screen, so the single-use auth code is exchanged only
 * once and the result is shared between consumers.
 */
export async function createSessionFromUrl(url: string): Promise<{ error: string | null }> {
  const params = parseOAuthCallbackParams(url);

  const oauthError = oauthErrorMessage(params);
  if (oauthError) return { error: oauthError };

  const code = params.code;
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (code) {
    const pending = pendingCodeExchanges.get(code);
    if (pending) return pending;
    const exchange = exchangeAuthCode(code).finally(() => {
      pendingCodeExchanges.delete(code);
    });
    pendingCodeExchanges.set(code, exchange);
    return exchange;
  }

  if (accessToken && refreshToken) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : i18n.t('authErrors.googleError') };
    }
  }

  return { error: i18n.t('authErrors.googleNotComplete') };
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

    return createSessionFromUrl(result.url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : i18n.t('authErrors.googleError');
    return { error: message };
  }
}
