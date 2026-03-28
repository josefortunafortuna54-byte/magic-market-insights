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
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ priceId, currency }),
    });
    const { url, error } = await res.json();
    if (error) { alert("Erro: " + error); return; }
    window.location.href = url;
  };

  return { user, subscription, isPremium, loading, checkout };
}
