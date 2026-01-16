import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MarketPrice = Tables<"market_prices">;
export type MarketAnalysis = Tables<"market_analysis">;

export function useMarketPrices() {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("market-prices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_prices" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["market-prices"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["market-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_prices")
        .select("*")
        .order("symbol");

      if (error) throw error;
      return data as MarketPrice[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarketAnalysis(timeframe?: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("market-analysis-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_analysis" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["market-analysis"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["market-analysis", timeframe],
    queryFn: async () => {
      let query = supabase
        .from("market_analysis")
        .select("*")
        .order("analyzed_at", { ascending: false });

      if (timeframe) {
        query = query.eq("timeframe", timeframe);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketAnalysis[];
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useMarketPriceForPair(symbol: string) {
  const { data: prices } = useMarketPrices();
  return prices?.find((p) => p.symbol === symbol.replace("/", ""));
}

export function useMarketAnalysisForPair(symbol: string, timeframe: string) {
  const { data: analyses } = useMarketAnalysis(timeframe);
  return analyses?.find((a) => a.symbol === symbol.replace("/", ""));
}

// Function to trigger market data refresh
export async function refreshMarketData() {
  const { data, error } = await supabase.functions.invoke("market-data");
  if (error) throw error;
  return data;
}

// Function to trigger analysis refresh
export async function refreshMarketAnalysis(timeframe: string = "H1") {
  const { data, error } = await supabase.functions.invoke("analyze-market", {
    body: { timeframe },
  });
  if (error) throw error;
  return data;
}
