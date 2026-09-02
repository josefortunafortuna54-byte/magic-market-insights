import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { lockAdmin } from '@/lib/adminGate';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  signOut: () => Promise<void>;
  updateProfile: (metadata: { full_name?: string }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  signOut: async () => {},
  updateProfile: async () => ({ ok: true }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = useCallback(async (metadata: { full_name?: string }) => {
    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error || !data.user) return { ok: false, error: error?.message };
    setUser(data.user);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    lockAdmin();
    setUser(null);
    router.replace('/(auth)/login');
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signOut, updateProfile }),
    [user, initializing, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
