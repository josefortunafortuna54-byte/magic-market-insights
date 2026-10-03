// stripe-checkout — Cria uma sessao de Stripe Checkout para o preco pedido.
//
// Chamado por mobile/src/lib/env.ts (EXPO_PUBLIC_STRIPE_CHECKOUT_URL). Nao usa o
// cliente Supabase: valida o JWT contra /auth/v1/user e fala directamente com a
// API do Stripe.
//
// Ambiente: le SUPABASE_* primeiro e cai para os nomes antigos PROJECT_URL /
// ANON_KEY. A versao anterior na raiz so aceitava os nomes antigos, que e um
// nome que o resto da arvore mobile nao usa.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const PROJECT_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY') ?? '';
  const SITE_URL = Deno.env.get('SITE_URL') || 'https://magic-market-insights.vercel.app';

  if (!STRIPE_SECRET_KEY || !PROJECT_URL || !ANON_KEY) {
    // Sem isto a falha seguinte seria um 401 do Stripe reportado como erro de auth.
    console.error('stripe-checkout: falta STRIPE_SECRET_KEY, SUPABASE_URL ou ANON_KEY');
    return json({ error: 'Stripe nao configurado.' }, 500);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Nao autenticado' }, 401);

    const token = authHeader.replace('Bearer ', '');

    const userRes = await fetch(`${PROJECT_URL}/auth/v1/user`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': ANON_KEY,
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error('stripe-checkout: auth error', userRes.status, errText);
      return json({ error: 'Auth failed: ' + errText }, 401);
    }

    const user = await userRes.json();

    const { priceId, currency } = await req.json();
    if (!priceId) return json({ error: 'priceId em falta' }, 400);

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', SITE_URL + '/planos?success=true');
    params.append('cancel_url', SITE_URL + '/planos?canceled=true');
    params.append('metadata[user_id]', user.id);
    params.append('metadata[currency]', currency || 'usd');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    // Nao se despeja a sessao no log: a resposta do Stripe traz `client_secret`,
    // que da para iniciar um pagamento sem o cliente. A versao anterior da raiz
    // fazia console.log do JSON completo.
    if (!session.url) {
      console.error('stripe-checkout: Stripe devolveu sessao sem url', stripeRes.status, session?.error?.message);
      return json({ error: session.error?.message || JSON.stringify(session) }, 400);
    }

    return json({ url: session.url });
  } catch (err) {
    console.error('stripe-checkout:', errorMessage(err));
    return json({ error: errorMessage(err) }, 500);
  }
});
