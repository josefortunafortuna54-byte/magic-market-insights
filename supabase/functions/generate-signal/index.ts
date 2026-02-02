import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { pair_id } = await req.json().catch(() => ({}));

    // Get a random trading pair if none specified
    let targetPairId = pair_id;
    if (!targetPairId) {
      const { data: pairs } = await supabase
        .from("trading_pairs")
        .select("id")
        .eq("is_active", true);

      if (pairs && pairs.length > 0) {
        targetPairId = pairs[Math.floor(Math.random() * pairs.length)].id;
      }
    }

    if (!targetPairId) {
      return new Response(
        JSON.stringify({ error: "No trading pairs available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pair details
    const { data: pair } = await supabase
      .from("trading_pairs")
      .select("*")
      .eq("id", targetPairId)
      .single();

    if (!pair) {
      return new Response(
        JSON.stringify({ error: "Trading pair not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signal based on simulated analysis
    const signalTypes = ["BUY", "SELL"];
    const timeframes = ["M5", "M15", "H1", "H4"];
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];

    // Simulate price levels (in reality, this would come from market data)
    const basePrice = 1.0 + Math.random() * 0.5;
    const pipValue = 0.0001;
    const slPips = 20 + Math.floor(Math.random() * 30);
    const tpPips = slPips * (1.5 + Math.random());

    let entryPrice: number, stopLoss: number, takeProfit: number;

    if (signalType === "BUY") {
      entryPrice = basePrice;
      stopLoss = basePrice - slPips * pipValue;
      takeProfit = basePrice + tpPips * pipValue;
    } else {
      entryPrice = basePrice;
      stopLoss = basePrice + slPips * pipValue;
      takeProfit = basePrice - tpPips * pipValue;
    }

    const confidence = 60 + Math.floor(Math.random() * 35);

    const reasons = [
      `RSI(14) indica ${signalType === "BUY" ? "sobrevenda" : "sobrecompra"}`,
      `EMA 21 ${signalType === "BUY" ? "cruzando acima" : "cruzando abaixo"} da EMA 50`,
      `Suporte/Resistência em ${entryPrice.toFixed(5)}`,
      `Momentum ${signalType === "BUY" ? "positivo" : "negativo"} confirmado`,
    ];

    // Insert the signal
    const { data: signal, error } = await supabase
      .from("signals")
      .insert({
        pair_id: targetPairId,
        signal_type: signalType,
        timeframe,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        confidence,
        reasons,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, signal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating signal:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
