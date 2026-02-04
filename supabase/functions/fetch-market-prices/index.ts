import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TwelveDataQuote {
  symbol: string;
  name?: string;
  exchange?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active trading pairs
    const { data: pairs, error: pairsError } = await supabase
      .from("trading_pairs")
      .select("id, symbol")
      .eq("is_active", true);

    if (pairsError) throw pairsError;
    if (!pairs || pairs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No trading pairs to update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { symbol: string; status: string; error?: string }[] = [];

    // Process each pair
    for (const pair of pairs) {
      try {
        // Format symbol for API (EUR/USD -> EURUSD)
        const apiSymbol = pair.symbol.replace("/", "");
        
        let price: number;
        let changePercent: number;
        let high24h: number | null = null;
        let low24h: number | null = null;

        // Try to fetch from Twelve Data API if key exists
        if (twelveDataApiKey) {
          const apiUrl = `https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${twelveDataApiKey}`;
          const response = await fetch(apiUrl);
          const data: TwelveDataQuote = await response.json();

          if (data.close) {
            price = parseFloat(data.close);
            changePercent = parseFloat(data.percent_change || "0");
            high24h = data.high ? parseFloat(data.high) : null;
            low24h = data.low ? parseFloat(data.low) : null;
          } else {
            // API returned error or no data, use simulated data
            console.log(`No data from API for ${pair.symbol}, using simulation`);
            const basePrice = getBasePrice(pair.symbol);
            const variation = (Math.random() - 0.5) * 0.002;
            price = basePrice * (1 + variation);
            changePercent = variation * 100;
            high24h = price * 1.002;
            low24h = price * 0.998;
          }
        } else {
          // No API key, use realistic simulated prices
          const basePrice = getBasePrice(pair.symbol);
          const variation = (Math.random() - 0.5) * 0.002;
          price = basePrice * (1 + variation);
          changePercent = variation * 100;
          high24h = price * 1.002;
          low24h = price * 0.998;
        }

        // Upsert the price in database
        const { error: upsertError } = await supabase
          .from("market_prices")
          .upsert(
            {
              pair_id: pair.id,
              symbol: pair.symbol,
              price,
              change_percent: changePercent,
              high_24h: high24h,
              low_24h: low24h,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "pair_id" }
          );

        if (upsertError) {
          results.push({ symbol: pair.symbol, status: "error", error: upsertError.message });
        } else {
          results.push({ symbol: pair.symbol, status: "updated" });
        }
      } catch (pairError) {
        const errorMessage = pairError instanceof Error ? pairError.message : "Unknown error";
        results.push({ symbol: pair.symbol, status: "error", error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: results.filter(r => r.status === "updated").length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching market prices:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Realistic base prices for common forex pairs
function getBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    "EUR/USD": 1.0850,
    "GBP/USD": 1.2650,
    "USD/JPY": 149.50,
    "USD/CHF": 0.8850,
    "AUD/USD": 0.6550,
    "USD/CAD": 1.3550,
    "NZD/USD": 0.6050,
    "EUR/GBP": 0.8580,
    "EUR/JPY": 162.20,
    "GBP/JPY": 189.10,
    "XAU/USD": 2025.50,
    "XAG/USD": 23.50,
    "BTC/USD": 42500.00,
    "ETH/USD": 2250.00,
  };
  return basePrices[symbol] || 1.0000;
}
