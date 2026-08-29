import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
import { Layout } from "@/components/layout/Layout";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdminEmail(user.email)) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
    };
    check();
  }, []);

  if (allowed === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">A verificar permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
}
