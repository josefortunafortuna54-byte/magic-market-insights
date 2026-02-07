import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active signals with their trading pair info
    const { data: activeSignals, error: signalsError } = await supabase
      .from("signals")
      .select(`*, trading_pairs (symbol)`)
      .eq("status", "active");

    if (signalsError) throw signalsError;
    if (!activeSignals || activeSignals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active signals to check", closed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current market prices
    const { data: prices, error: pricesError } = await supabase
      .from("market_prices")
      .select("pair_id, price");

    if (pricesError) throw pricesError;

    const priceMap = new Map<string, number>();
    for (const p of prices || []) {
      priceMap.set(p.pair_id, p.price);
    }

    const results: { id: string; symbol: string; result: string; profit: number }[] = [];

    for (const signal of activeSignals) {
      const currentPrice = priceMap.get(signal.pair_id);
      if (!currentPrice) continue;

      let result: "tp" | "sl" | null = null;
      let profitPercent = 0;

      const isBuy = signal.signal_type === "BUY";

      if (isBuy) {
        // BUY: TP hit when price >= take_profit, SL hit when price <= stop_loss
        if (currentPrice >= signal.take_profit) {
          result = "tp";
          profitPercent = ((signal.take_profit - signal.entry_price) / signal.entry_price) * 100;
        } else if (currentPrice <= signal.stop_loss) {
          result = "sl";
          profitPercent = ((signal.stop_loss - signal.entry_price) / signal.entry_price) * 100;
        }
      } else {
        // SELL: TP hit when price <= take_profit, SL hit when price >= stop_loss
        if (currentPrice <= signal.take_profit) {
          result = "tp";
          profitPercent = ((signal.entry_price - signal.take_profit) / signal.entry_price) * 100;
        } else if (currentPrice >= signal.stop_loss) {
          result = "sl";
          profitPercent = ((signal.entry_price - signal.stop_loss) / signal.entry_price) * 100;
        }
      }

      // Also auto-close signals older than 24h as expired (SL)
      if (!result) {
        const createdAt = new Date(signal.created_at).getTime();
        const now = Date.now();
        const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
        if (hoursElapsed > 24) {
          result = "sl";
          if (isBuy) {
            profitPercent = ((currentPrice - signal.entry_price) / signal.entry_price) * 100;
          } else {
            profitPercent = ((signal.entry_price - currentPrice) / signal.entry_price) * 100;
          }
        }
      }

      if (result) {
        const now = new Date().toISOString();

        // Update signal status
        await supabase
          .from("signals")
          .update({ status: result, closed_at: now })
          .eq("id", signal.id);

        // Record in trades_history
        await supabase.from("trades_history").insert({
          signal_id: signal.id,
          result: result === "tp" ? "win" : "loss",
          profit_percent: Math.round(profitPercent * 100) / 100,
          closed_at: now,
        });

        const symbol = signal.trading_pairs?.symbol || "Unknown";
        results.push({ id: signal.id, symbol, result, profit: Math.round(profitPercent * 100) / 100 });
        console.log(`Closed signal ${signal.id} (${symbol}): ${result} | ${profitPercent.toFixed(2)}%`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, closed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error auto-closing signals:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
