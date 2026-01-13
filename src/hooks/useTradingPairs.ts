import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TradingPair = Tables<"trading_pairs">;

export function useTradingPairs() {
  return useQuery({
    queryKey: ["trading-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .order("is_premium", { ascending: true })
        .order("symbol", { ascending: true });

      if (error) throw error;
      return data as TradingPair[];
    },
  });
}

export function useAllTradingPairs() {
  return useQuery({
    queryKey: ["all-trading-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .order("symbol", { ascending: true });

      if (error) throw error;
      return data as TradingPair[];
    },
  });
}
