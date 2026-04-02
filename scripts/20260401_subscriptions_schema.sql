-- Creazione della tabella `subscriptions` per tracciare gli abbonamenti e il trial
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled', 'trial_expired'
    price_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sicurezza: Abilitiamo la Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: L'utente può leggere SOLO il proprio abbonamento
CREATE POLICY "Gli utenti possono leggere il proprio abbonamento" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- La logica di admin (Webhook Stripe) scriverà qui bypassando l'RLS (Service Role Key)

-- Funzione per creare automaticamente 7 giorni di trial ogni volta che si registra un nuovo utente
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, status, current_period_end)
    VALUES (NEW.id, 'trialing', now() + interval '7 days');
    RETURN NEW;
END;
$$;

-- Trigger che scatta dopo che un rigo viene inserito in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- OPZIONALE: Inserire il record per gli utenti che ESISTONO GIA' e segnarli come "trial_expired" (in modo che debbano pagare da subito)
INSERT INTO public.subscriptions (user_id, status, current_period_end)
SELECT id, 'trial_expired', now() - interval '1 day'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;
