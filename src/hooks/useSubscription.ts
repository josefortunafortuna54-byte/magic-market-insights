import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Subscription {
  status: "active" | "inactive";
  currency: string;
  stripe_price_id: string;
  current_period_end: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setSubscription(data || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (!session?.user) { setSubscription(null); setLoading(false); }
      else fetchData();
    });
    return () => authSub.unsubscribe();
  }, []);

  const isPremium = subscription?.status === "active";

  const checkout = async (priceId: string, currency: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ priceId, currency }),
      });

      const data = await res.json();
      if (data.error) { alert("Erro: " + data.error); return; }
      if (!data.url) { alert("Erro: URL de pagamento não recebida."); return; }
      window.location.href = data.url;
    } catch (err) {
      alert("Erro de ligação. Tenta novamente.");
    }
  };

  return { user, subscription, isPremium, loading, checkout };
}
