import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.20.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Otteniamo l'utente autenticato (sicuro)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Non autenticato');
    }

    const { priceId } = await req.json();

    if (!priceId) {
      throw new Error('Nessun priceId fornito');
    }

    console.log(`Creazione checkout per utente ${user.id} con prezzo ${priceId}`);

    // Cerchiamo se l'utente ha già un customerId in Stripe (nella tabella subscriptions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usiamo Service Role per bypassare RLS se necessario
    );

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Se non esiste un customerId, lo creiamo su Stripe
    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = newCustomer.id;
      
      // Salviamo il nuovo customer_id nel DB
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Creiamo la sessione di Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId, // Usiamo il Customer ID trovato o creato
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${origin}?payment=success`,
      cancel_url: `${origin}?payment=cancel`,
      client_reference_id: user.id, // FONDAMENTALE: collega il pagamento a questo utente
      metadata: {
        userId: user.id,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
