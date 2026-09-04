import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

serve(async (req) => {
  try {
    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const supabase = createClient(PROJECT_URL!, SERVICE_ROLE_KEY!);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const session = event.data.object as any;

    if (event.type === "checkout.session.completed") {
      const userId = session.metadata?.user_id;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;
      const currency = session.metadata?.currency || "usd";

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        status: "active",
        currency,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { onConflict: "user_id" });
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      const status = subscription.status === "active" ? "active" : "inactive";

      await supabase.from("subscriptions")
        .update({
          status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
