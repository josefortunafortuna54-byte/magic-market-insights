import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, canAccessPair, canAccessTimeframe, type PlanTier } from "@/lib/gating";
import type { Subscription } from "@/lib/types";

const VALID_TIERS: PlanTier[] = ["free", "basic", "pro", "premium"];

async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);
  return data?.[0] ?? null;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => (user ? fetchSubscription(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 60_000,
  });

  const value = useMemo(() => {
    const active = subscription?.status === "active";
    const rawPlan = subscription?.plan ?? "free";
    const tier: PlanTier =
      active && VALID_TIERS.includes(rawPlan as PlanTier) ? (rawPlan as PlanTier) : "free";
    const isPremium = tier !== "free";
    const limits = PLAN_LIMITS[tier];
    const currency = (subscription?.currency as "usd" | "aoa") ?? "usd";
    return {
      user,
      subscription,
      tier,
      currency,
      loading: isLoading,
      isPremium,
      canAccessBanca: tier === "premium",
      hasAnalysis: limits.hasAnalysis,
      limits,
      canAccessPair: (pair: string) => canAccessPair(pair, tier),
      canAccessTimeframe: (tf: string) => canAccessTimeframe(tf, tier),
      checkout: async (_priceId?: string, _currency?: "usd" | "aoa") => {
        window.location.href = "/planos";
      },
    };
  }, [subscription, user, isLoading]);

  return value;
}