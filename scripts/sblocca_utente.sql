-- =========================================================================
-- PARTE 1: CREAZIONE TABELLA (Risolve l'errore "relation does not exist")
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trialing',
    price_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assicuriamoci di inserire un record di base per gli utenti esistenti 
INSERT INTO public.subscriptions (user_id, status, current_period_end)
SELECT id, 'trial_expired', now() - interval '1 day'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- PARTE 1: SBLOCCO ACCOUNT E RESET PASSWORD (MIRATO SU ID)
-- =========================================================================

-- 1. Imposta la password (010309) usando il percorso corretto delle estensioni
-- e colpendo ESATTAMENTE l'ID utente che mi hai mostrato nello screen
UPDATE auth.users 
SET 
    encrypted_password = extensions.crypt('010309', extensions.gen_salt('bf'))
WHERE id = '7f8030fb-a44d-4ddc-954e-aa44fa8e13a7';

-- 2. Sblocca dai pagamenti rendendo l'abbonamento "Attivo" e con scadenza nel 2099
UPDATE public.subscriptions 
SET status = 'active', 
    current_period_end = '2099-12-31 23:59:59+00' 
WHERE user_id = '7f8030fb-a44d-4ddc-954e-aa44fa8e13a7';