// stripe-webhook — Recebe os eventos da Stripe e mantem `subscriptions` em dia.
//
// Nao e chamada por nenhum codigo do repo: o endpoint e registado no dashboard da
// Stripe.Por isso nao ha caller a grepar — a ausencia de referencias aqui e
// esperada, e a razao de esta funcao nao poder ser tratada como codigo morto.
//
// Ambiente: ja aceitava SUPABASE_* e os nomes antigos PROJECT_URL /
// SERVICE_ROLE_KEY. Essa tolerancia foi mantida.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'npm:stripe@14.21.0';

serve(async (req) => {
  try {
    const PROJECT_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL');
    const SERVICE_ROLE_KEY =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!PROJECT_URL || !SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('stripe-webhook: falta uma das variaveis de ambiente obrigatorias');
      return new Response(JSON.stringify({ error: 'Webhook nao configurado' }), { status: 500 });
    }

    // Sem apiVersion explicito: o stripe@14.21.0 fixa 2023-10-16 nos seus tipos
    // e nao aceita 2024-06-20. A versao da raiz declarava 2024-06-20, mas o import
    // esm.sh nao trazia os tipos reais do npm e o erro nunca apareceu. Confirmar
    // a versao da conta no dashboard da Stripe.
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'stripe-signature em falta' }), { status: 400 });
    }

    let event: Stripe.Event;
    try {
      // A assinatura e a unica prova de que o pedido veio da Stripe. Sem ela,
      // qualquer um podia escrever na tabela `subscriptions`.
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(`Webhook Error: ${msg}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === 'checkout.session.completed') {
      const userId = session.metadata?.user_id;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (!userId || !subscriptionId) {
        console.error('stripe-webhook: checkout.session.completed sem user_id ou subscription');
        return new Response(JSON.stringify({ error: 'missing metadata' }), { status: 400 });
      }

      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId as string,
      );
      const priceId = subscription.items.data[0]?.price.id;
      const currency = session.metadata?.currency || 'usd';

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        status: 'active',
        currency,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { onConflict: 'user_id' });

      // Sem este erro a resposta era 200 e a subscricao nao existia: o Stripe
      // receberia 2xx, deixaria de reenviar, e o pagamento ficava sem plano.
      if (error) {
        console.error('stripe-webhook: falha ao gravar subscription', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status === 'active' ? 'active' : 'inactive';

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('stripe-webhook: falha ao actualizar subscription', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
