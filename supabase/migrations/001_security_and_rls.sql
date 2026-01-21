-- ⚠️ ESEGUIRE NEL SUPABASE SQL EDITOR PRIMA DI USARE LA NUOVA VERSIONE

-- 1. Aggiungi la colonna user_id per separare i dati dei saloni (Multi-tenant)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Assegna i dati "orfani" (se ci sono) al tuo attuale utente (opzionale, se sai il tuo UUID)
-- UPDATE public.clients SET user_id = 'il-tuo-uuid-qui' WHERE user_id IS NULL;
-- Per ora li lasciamo NULL (invisibili) finché non li rivendichi o cancelli.

-- 3. Abilita la sicurezza RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 4. Rimuovi vecchie policy pubbliche (se esistono)
DROP POLICY IF EXISTS "Accesso pubblico clienti" ON public.clients;
DROP POLICY IF EXISTS "Accesso pubblico appuntamenti" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

-- 5. Crea Nuove Policy Strette (Solo il proprietario vede i suoi dati)

-- CLIENTI
CREATE POLICY "Users can view own clients" ON public.clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
FOR DELETE USING (auth.uid() = user_id);

-- APPUNTAMENTI
CREATE POLICY "Users can view own appointments" ON public.appointments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments" ON public.appointments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON public.appointments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments" ON public.appointments
FOR DELETE USING (auth.uid() = user_id);

-- 6. INDEXING (Performance per quando avrai molti dati)
CREATE INDEX IF NOT EXISTS idx_clients_userid ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_userid ON public.appointments(user_id);
