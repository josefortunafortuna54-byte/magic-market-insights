import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS, SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.trim().toLowerCase() === normalized);
}
