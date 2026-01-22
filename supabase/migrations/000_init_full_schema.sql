-- ⚠️ ESEGUIRE QUESTO SCRIPT NEL PROGETTO "Parrucchieria DEV" (SQL EDITOR)
-- Questo script crea tutto da zero per l'ambiente di sviluppo.

-- 1. CREAZIONE TABELLE

-- Tabella Clienti
CREATE TABLE public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id) -- Multi-tenant column
);

-- Tabella Appuntamenti
CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  client_id uuid REFERENCES public.clients(id) NOT NULL,
  date date NOT NULL,
  start_time text, -- Opzionale, formato HH:mm
  treatment text NOT NULL,
  price numeric, -- Può essere NULL (Prenotazione) o importo (Incasso)
  notes text,
  user_id uuid REFERENCES auth.users(id) -- Multi-tenant column
);

-- 2. SICUREZZA (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES (Regole di accesso)

-- Policy per Clienti
CREATE POLICY "Users can view own clients" ON public.clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
FOR DELETE USING (auth.uid() = user_id);

-- Policy per Appuntamenti
CREATE POLICY "Users can view own appointments" ON public.appointments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments" ON public.appointments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON public.appointments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments" ON public.appointments
FOR DELETE USING (auth.uid() = user_id);

-- 4. INDICI DI PERFORMANCE
CREATE INDEX idx_clients_userid ON public.clients(user_id);
CREATE INDEX idx_appointments_userid ON public.appointments(user_id);
