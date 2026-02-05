import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AISignalAnalysis {
  signal_type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  reasons: string[];
  analysis_summary: string;
}

async function analyzeWithAI(
  symbol: string,
  currentPrice: number,
  high24h: number | null,
  low24h: number | null,
  changePercent: number | null,
  timeframe: string
): Promise<AISignalAnalysis> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `Você é um analista de trading profissional. Analise os seguintes dados de mercado e forneça um sinal de trading.

DADOS DO MERCADO:
- Par: ${symbol}
- Preço Atual: ${currentPrice}
- Máxima 24h: ${high24h ?? "N/A"}
- Mínima 24h: ${low24h ?? "N/A"}
- Variação 24h: ${changePercent ?? 0}%
- Timeframe: ${timeframe}

REGRAS DE ANÁLISE:
1. Se a variação for negativa e o preço estiver próximo da mínima 24h, considere BUY (sobrevenda)
2. Se a variação for positiva e o preço estiver próximo da máxima 24h, considere SELL (sobrecompra)
3. Se não houver sinais claros, retorne HOLD
4. Confidence deve ser entre 60-95 para sinais claros, e abaixo de 50 para HOLD
5. Stop loss deve ser 1-3% do preço de entrada
6. Take profit deve ter risco/retorno mínimo de 1:1.5

Responda APENAS em JSON válido no formato:
{
  "signal_type": "BUY" | "SELL" | "HOLD",
  "confidence": número entre 0-100,
  "entry_price": preço de entrada,
  "stop_loss": preço de stop loss,
  "take_profit": preço de take profit,
  "reasons": ["razão 1", "razão 2", "razão 3"],
  "analysis_summary": "resumo em uma frase da análise"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Você é um analista de trading experiente que analisa mercados Forex, Commodities e Criptomoedas. Responda sempre em JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const analysis = JSON.parse(jsonStr) as AISignalAnalysis;
    
    // Validate and sanitize the response
    if (!["BUY", "SELL", "HOLD"].includes(analysis.signal_type)) {
      analysis.signal_type = "HOLD";
    }
    
    analysis.confidence = Math.min(100, Math.max(0, analysis.confidence || 50));
    analysis.entry_price = analysis.entry_price || currentPrice;
    analysis.reasons = analysis.reasons || ["Análise técnica automatizada"];
    
    return analysis;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Failed to parse AI response as JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { pair_id, timeframe: requestedTimeframe } = await req.json().catch(() => ({}));

    // Get trading pairs to analyze
    let targetPairs: { id: string; symbol: string }[] = [];
    
    if (pair_id) {
      const { data: pair } = await supabase
        .from("trading_pairs")
        .select("id, symbol")
        .eq("id", pair_id)
        .eq("is_active", true)
        .single();
      
      if (pair) targetPairs = [pair];
    } else {
      // Get all active pairs
      const { data: pairs } = await supabase
        .from("trading_pairs")
        .select("id, symbol")
        .eq("is_active", true);
      
      if (pairs) targetPairs = pairs;
    }

    if (targetPairs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No trading pairs available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timeframes = ["M5", "M15", "H1", "H4"];
    const timeframe = requestedTimeframe || timeframes[Math.floor(Math.random() * timeframes.length)];
    const generatedSignals: unknown[] = [];
    const errors: string[] = [];

    for (const pair of targetPairs) {
      try {
        // Get current market price
        const { data: marketPrice } = await supabase
          .from("market_prices")
          .select("*")
          .eq("pair_id", pair.id)
          .single();

        if (!marketPrice) {
          console.log(`No market price for ${pair.symbol}, skipping`);
          continue;
        }

        console.log(`Analyzing ${pair.symbol} with AI...`);

        // Analyze with AI
        const analysis = await analyzeWithAI(
          pair.symbol,
          marketPrice.price,
          marketPrice.high_24h,
          marketPrice.low_24h,
          marketPrice.change_percent,
          timeframe
        );

        console.log(`AI Analysis for ${pair.symbol}:`, analysis);

        // Skip HOLD signals - only insert actionable signals
        if (analysis.signal_type === "HOLD") {
          console.log(`${pair.symbol}: HOLD signal, skipping insertion`);
          continue;
        }

        // Insert the AI-generated signal
        const { data: signal, error: insertError } = await supabase
          .from("signals")
          .insert({
            pair_id: pair.id,
            signal_type: analysis.signal_type,
            timeframe,
            entry_price: analysis.entry_price,
            stop_loss: analysis.stop_loss,
            take_profit: analysis.take_profit,
            confidence: analysis.confidence,
            reasons: [
              `🤖 IA: ${analysis.analysis_summary}`,
              ...analysis.reasons.slice(0, 3)
            ],
            status: "active",
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting signal for ${pair.symbol}:`, insertError);
          errors.push(`${pair.symbol}: ${insertError.message}`);
        } else {
          console.log(`Signal generated for ${pair.symbol}:`, signal);
          generatedSignals.push(signal);
        }

        // Also save to market_analysis for historical reference
        await supabase.from("market_analysis").insert({
          pair_id: pair.id,
          symbol: pair.symbol,
          signal_type: analysis.signal_type,
          confidence: analysis.confidence,
          entry_price: analysis.entry_price,
          stop_loss: analysis.stop_loss,
          take_profit: analysis.take_profit,
          timeframe,
          reasons: analysis.reasons,
          trend: analysis.signal_type === "BUY" ? "bullish" : "bearish",
        });

      } catch (pairError) {
        console.error(`Error processing ${pair.symbol}:`, pairError);
        errors.push(`${pair.symbol}: ${pairError instanceof Error ? pairError.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        signals_generated: generatedSignals.length,
        signals: generatedSignals,
        errors: errors.length > 0 ? errors : undefined 
      }),
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
