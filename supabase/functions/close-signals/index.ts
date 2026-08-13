import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { verifyAdminRequest } from "../_shared/admin.ts";

// Fallback prices when the live API fails (kept close to current levels)
const FALLBACK_PRICES: Record<string, number> = {
  EURUSD: 1.085, GBPUSD: 1.271, USDJPY: 149.5,
  AUDUSD: 0.634, EURGBP: 0.859, USDCHF: 0.897,
  NZDUSD: 0.578, USDCAD: 1.362, XAUUSD: 3350, BTCUSD: 110000,
};

async function fetchCurrentPrice(symbol: string): Promise<number> {
  const clean = symbol.replace("/", "");

  if (clean === "BTCUSD") {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
      const json = await res.json();
      const price = Number(json?.bitcoin?.usd);
      if (price && !isNaN(price)) return price;
    } catch { /* fallback */ }
  } else if (clean === "XAUUSD") {
    try {
      const res = await fetch("https://api.gold-api.com/price/XAU");
      const json = await res.json();
      const price = Number(json?.price);
      if (price && !isNaN(price)) return price;
    } catch { /* fallback */ }
  } else {
    try {
      const base = clean.slice(0, 3);
      const quote = clean.slice(3, 6);
      const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
      const json = await res.json();
      const price = Number(json?.rates?.[quote]);
      if (price && !isNaN(price)) return price;
    } catch { /* fallback */ }
  }

  return FALLBACK_PRICES[clean] ?? 1.0;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), { status: 403, headers: corsHeaders });
    }

    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env keys" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

    const { data: activeSignals, error: selectError } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "active");

    if (selectError) throw new Error(selectError.message);
    if (!activeSignals || activeSignals.length === 0) {
      return new Response(JSON.stringify({ message: "Sem sinais ativos" }), { headers: corsHeaders });
    }

    // Fetch all current prices in parallel (single pass, ~1-2s)
    const symbols = [...new Set(activeSignals.map((s) => String(s.symbol).replace("/", "")))];
    const prices: Record<string, number> = {};
    await Promise.all(symbols.map(async (sym) => {
      prices[sym] = await fetchCurrentPrice(sym);
    }));

    const now = Date.now();
    const results: Array<Record<string, unknown>> = [];

    for (const signal of activeSignals) {
      const symbol = String(signal.symbol).replace("/", "");
      const currentPrice = prices[symbol] ?? FALLBACK_PRICES[symbol] ?? 1.0;

      const entry = Number(signal.entry_price);
      const tp = Number(signal.target_price);
      const sl = Number(signal.stop_loss);
      const type = String(signal.signal_type || "").toUpperCase();

      let newStatus: string | null = null;

      if (type === "BUY") {
        if (currentPrice >= tp) newStatus = "tp";
        else if (currentPrice <= sl) newStatus = "sl";
      } else if (type === "SELL") {
        if (currentPrice <= tp) newStatus = "tp";
        else if (currentPrice >= sl) newStatus = "sl";
      }

      const hoursOld = (now - new Date(signal.created_at).getTime()) / (1000 * 60 * 60);

      if (hoursOld < 2) continue;
      if (hoursOld > 48 && !newStatus) newStatus = "sl";

      if (newStatus) {
        const { error: updateError } = await supabase
          .from("signals")
          .update({ status: newStatus })
          .eq("id", signal.id);
        if (updateError) {
          results.push({ symbol, id: signal.id, error: updateError.message });
          continue;
        }
        results.push({ symbol, id: signal.id, closed: newStatus, currentPrice });
      }
    }

    return new Response(JSON.stringify({ success: true, closed: results.filter(r => r.closed).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
