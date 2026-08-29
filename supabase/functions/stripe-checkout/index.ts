import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const PROJECT_URL = Deno.env.get("PROJECT_URL")!;
    const ANON_KEY = Deno.env.get("ANON_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL") || "https://magic-market-insights.vercel.app";

    console.log("PROJECT_URL:", PROJECT_URL);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Nao autenticado" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");

    const userRes = await fetch(`${PROJECT_URL}/auth/v1/user`, {
      headers: {
        "Authorization": "Bearer " + token,
        "apikey": ANON_KEY,
      }
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("Auth error:", errText);
      return new Response(JSON.stringify({ error: "Auth failed: " + errText }), { status: 401, headers: corsHeaders });
    }

    const user = await userRes.json();
    console.log("User ID:", user.id);

    const { priceId, currency } = await req.json();
    if (!priceId) return new Response(JSON.stringify({ error: "priceId em falta" }), { status: 400, headers: corsHeaders });

    console.log("Calling Stripe with priceId:", priceId);

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", SITE_URL + "/planos?success=true");
    params.append("cancel_url", SITE_URL + "/planos?canceled=true");
    params.append("metadata[user_id]", user.id);
    params.append("metadata[currency]", currency || "usd");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    console.log("Stripe response:", JSON.stringify(session));

    if (!session.url) {
      return new Response(JSON.stringify({ error: session.error?.message || JSON.stringify(session) }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Global error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
