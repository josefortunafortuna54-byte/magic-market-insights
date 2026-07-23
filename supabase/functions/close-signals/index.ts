import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const ASSET_PIP: Record<string, { pipSize: number; digits: number }> = {
  EURUSD: { pipSize: 0.0001, digits: 5 }, GBPUSD: { pipSize: 0.0001, digits: 5 },
  USDJPY: { pipSize: 0.01,   digits: 3 }, AUDUSD: { pipSize: 0.0001, digits: 5 },
  EURGBP: { pipSize: 0.0001, digits: 5 }, USDCHF: { pipSize: 0.0001, digits: 5 },
  NZDUSD: { pipSize: 0.0001, digits: 5 }, USDCAD: { pipSize: 0.0001, digits: 5 },
  XAUUSD: { pipSize: 0.01,   digits: 2 }, BTCUSD: { pipSize: 1,      digits: 2 },
};

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("apikey");
    if (!authHeader || !apiKey) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), { status: 401, headers: corsHeaders });
    }

    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(PROJECT_URL!, SERVICE_ROLE_KEY!);

    const { data: activeSignals } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "active");

    if (!activeSignals || activeSignals.length === 0) {
      return new Response(JSON.stringify({ message: "Sem sinais ativos" }), { headers: corsHeaders });
    }

    const results = [];

    for (const signal of activeSignals) {
      const symbol = signal.symbol.replace("/", "");
      const assetType = symbol === "BTCUSD" ? "crypto" : symbol === "XAUUSD" ? "gold" : "forex";

      let currentPrice: number;
      try {
        if (assetType === "crypto") {
          const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
          const json = await res.json();
          currentPrice = Number(json?.bitcoin?.usd);
        } else if (assetType === "gold") {
          const res = await fetch("https://api.frankfurter.app/latest?from=XAU&to=USD");
          const json = await res.json();
          currentPrice = Number(json?.rates?.USD);
        } else {
          const base = symbol.slice(0, 3);
          const quote = symbol.slice(3, 6);
          const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
          const json = await res.json();
          currentPrice = Number(json?.rates?.[quote]);
        }
        if (!currentPrice || isNaN(currentPrice)) throw new Error("Invalid price");
      } catch {
        const fallback: Record<string, number> = {
          EURUSD: 1.155, GBPUSD: 1.271, USDJPY: 148.5,
          AUDUSD: 0.634, EURGBP: 0.859, USDCHF: 0.897,
          NZDUSD: 0.578, USDCAD: 1.362, XAUUSD: 3350, BTCUSD: 111500,
        };
        currentPrice = fallback[symbol] || 1.0;
      }

      const entry = Number(signal.entry_price);
      const tp = Number(signal.target_price);
      const sl = Number(signal.stop_loss);
      const type = signal.signal_type?.toUpperCase();

      let newStatus: string | null = null;

      if (type === "BUY") {
        if (currentPrice >= tp) newStatus = "tp";
        else if (currentPrice <= sl) newStatus = "sl";
      } else if (type === "SELL") {
        if (currentPrice <= tp) newStatus = "tp";
        else if (currentPrice >= sl) newStatus = "sl";
      }

      const createdAt = new Date(signal.created_at);
      const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursOld < 2) continue;
      if (hoursOld > 48 && !newStatus) newStatus = "sl";

      if (newStatus) {
        await supabase
          .from("signals")
          .update({ status: newStatus })
          .eq("id", signal.id);
        results.push({ symbol, id: signal.id, closed: newStatus, currentPrice });
      }
    }

    return new Response(JSON.stringify({ success: true, closed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
