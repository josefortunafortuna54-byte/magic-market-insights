import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradingPair {
  id: string;
  symbol: string;
  name: string;
  category: string;
  is_premium: boolean;
  is_active: boolean;
}

export function useTradingPairs() {
  return useQuery({
    queryKey: ["trading-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .order("symbol");

      if (error) {
        throw error;
      }

      return data as TradingPair[];
    },
  });
}
