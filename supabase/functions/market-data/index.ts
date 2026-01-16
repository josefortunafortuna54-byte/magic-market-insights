import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradingPair {
  id: string;
  symbol: string;
  category: string;
  is_active: boolean;
}

interface PriceData {
  symbol: string;
  price: number;
  change_percent: number;
  high_24h?: number;
  low_24h?: number;
  volume?: number;
}

// Format symbol for Twelve Data API
function formatSymbolForApi(symbol: string, category: string): string {
  // Remove any slashes
  const clean = symbol.replace("/", "");
  
  if (category === "crypto") {
    // For crypto, Twelve Data uses format like BTC/USD
    return symbol.includes("/") ? symbol : `${clean.slice(0, 3)}/${clean.slice(3)}`;
  }
  
  // For forex and commodities, use format like EUR/USD
  if (clean === "XAUUSD") return "XAU/USD";
  return symbol.includes("/") ? symbol : `${clean.slice(0, 3)}/${clean.slice(3)}`;
}

async function fetchPriceFromTwelveData(
  symbol: string,
  category: string,
  apiKey: string
): Promise<PriceData | null> {
  const formattedSymbol = formatSymbolForApi(symbol, category);
  
  try {
    // Get real-time price
    const priceUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(formattedSymbol)}&apikey=${apiKey}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    
    if (priceData.code || !priceData.price) {
      console.error(`Error fetching price for ${symbol}:`, priceData);
      return null;
    }

    // Get quote for additional data (change, high, low)
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(formattedSymbol)}&apikey=${apiKey}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    const price = parseFloat(priceData.price);
    let changePercent = 0;
    let high24h = price;
    let low24h = price;
    let volume = 0;

    if (!quoteData.code && quoteData.percent_change) {
      changePercent = parseFloat(quoteData.percent_change) || 0;
      high24h = parseFloat(quoteData.high) || price;
      low24h = parseFloat(quoteData.low) || price;
      volume = parseFloat(quoteData.volume) || 0;
    }

    console.log(`Fetched price for ${symbol}: ${price}, change: ${changePercent}%`);

    return {
      symbol: symbol.replace("/", ""),
      price,
      change_percent: changePercent,
      high_24h: high24h,
      low_24h: low24h,
      volume,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY")!;

    if (!twelveDataApiKey) {
      throw new Error("TWELVE_DATA_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active trading pairs
    const { data: pairs, error: pairsError } = await supabase
      .from("trading_pairs")
      .select("*")
      .eq("is_active", true);

    if (pairsError) {
      throw pairsError;
    }

    console.log(`Fetching prices for ${pairs?.length || 0} pairs`);

    const results: PriceData[] = [];

    // Fetch prices for each pair with small delay to respect rate limits
    for (const pair of pairs || []) {
      const priceData = await fetchPriceFromTwelveData(
        pair.symbol,
        pair.category,
        twelveDataApiKey
      );

      if (priceData) {
        // Upsert to database
        const { error: upsertError } = await supabase
          .from("market_prices")
          .upsert(
            {
              pair_id: pair.id,
              symbol: priceData.symbol,
              price: priceData.price,
              change_percent: priceData.change_percent,
              high_24h: priceData.high_24h,
              low_24h: priceData.low_24h,
              volume: priceData.volume,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "pair_id" }
          );

        if (upsertError) {
          console.error(`Error upserting price for ${pair.symbol}:`, upsertError);
        } else {
          results.push(priceData);
        }
      }

      // Small delay between API calls to respect rate limits (8 calls/minute for free tier)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`Successfully updated ${results.length} prices`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: results.length,
        prices: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in market-data function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
