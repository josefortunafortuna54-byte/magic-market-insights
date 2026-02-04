import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MarketPrice {
  id: string;
  pair_id: string;
  symbol: string;
  price: number;
  change_percent: number | null;
  high_24h: number | null;
  low_24h: number | null;
  volume: number | null;
  updated_at: string;
}

export function useMarketPrices() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["market-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_prices")
        .select("*")
        .order("symbol");

      if (error) {
        throw error;
      }

      return data as MarketPrice[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds as backup
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("market-prices-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_prices",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["market-prices"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMarketPrice(symbol: string) {
  const { data: prices, ...rest } = useMarketPrices();
  const price = prices?.find((p) => p.symbol === symbol);
  return { data: price, ...rest };
}
