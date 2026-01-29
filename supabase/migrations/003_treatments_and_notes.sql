-- 1. Aggiungi il campo 'notes' alla tabella appuntamenti (se non esiste già)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'notes') THEN
        ALTER TABLE public.appointments ADD COLUMN notes text;
    END IF;
END $$;

-- 2. Crea la tabella dei trattamenti
CREATE TABLE IF NOT EXISTS public.treatments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL, -- Defaults to current user
  name text NOT NULL,
  category text DEFAULT 'Generale',
  CONSTRAINT treatments_name_userid_key UNIQUE (name, user_id) -- Evita duplicati per lo stesso utente
);

-- 3. Abilita RLS
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- 4. Policies per treatments
-- Elimina vecchie policy se esistono per evitare conflitti
DROP POLICY IF EXISTS "Users can view own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can insert own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can update own treatments" ON public.treatments;
DROP POLICY IF EXISTS "Users can delete own treatments" ON public.treatments;

CREATE POLICY "Users can view own treatments" ON public.treatments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own treatments" ON public.treatments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own treatments" ON public.treatments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own treatments" ON public.treatments FOR DELETE USING (auth.uid() = user_id);

-- 5. Funzione per inizializzare i trattamenti di default (opzionale, ma utile)
-- Questa funzione può essere chiamata dal frontend se la lista è vuota
