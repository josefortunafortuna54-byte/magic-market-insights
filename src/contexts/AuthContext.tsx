import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { lockAdmin } from "@/lib/adminGate";
import { notifyAdmins } from "@/lib/adminAlerts";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Alerta de novo registo (inclui signups com confirmação de email e OAuth,
  // que não passam pelo formulário de registo). O trigger em auth.users já
  // criou a notificação in-app; esta chamada só faz o fan-out externo.
  useEffect(() => {
    if (!user) return;
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : NaN;
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) return;

    const key = `tmt_admin_new_user_alert_${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* localStorage indisponível: segue com o alerta */
    }

    void notifyAdmins({
      type: "new_user",
      title: "Novo registo",
      message: user.email ?? user.id,
      entity_type: "user",
      entity_id: user.id,
      data: { email: user.email },
    });
  }, [user]);

  const signOut = async () => {
    lockAdmin();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}