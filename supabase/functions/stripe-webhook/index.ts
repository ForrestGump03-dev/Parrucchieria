import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.20.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature || !endpointSecret) {
    return new Response('Mancano le configurazioni del webhook', { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret, undefined, Stripe.createCryptoProvider());
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return new Response(`Errore sicurezza Webhook: ${err.message}`, { status: 400 });
  }

  // Usa il ROLE KEY (potente) per scavalcare l'RLS e aggiornare le tabelle!
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`Evento Ricevuto: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Questo ce lo siamo passati noi prima di inviarlo! (L'ID su Supabase)
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        if (!userId) throw new Error("Manca il client_reference_id alla sessione");

        console.log(`Session completata per utente: ${userId}, Stripe Customer: ${customerId}`);

        // Scriviamo nel database Supabase il legame utente -> cliente Stripe
        await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active'
          })
          .eq('user_id', userId);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subId = subscription.id;
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        console.log(`Aggiornamento Sub: ${subId} -> status: ${status}, end: ${currentPeriodEnd}`);

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: status,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd
          })
          .eq('stripe_subscription_id', subId);
        break;
      }
      
      default:
        console.log(`Eccezione non gestita, evento inutile: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error(`Errore salvataggio Supabase: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
