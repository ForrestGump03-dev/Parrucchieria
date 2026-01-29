-- Crea la tabella dei trattamenti (Listino prezzi)
CREATE TABLE public.treatments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  price numeric DEFAULT 0,
  category text, -- 'Design', 'Cromia', 'Cura', 'Permanente'
  duration integer DEFAULT 30 -- Durata in minuti, utile per l'agenda in futuro
);

-- Abilita RLS
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Policy: L'utente vede solo i SUOI trattamenti
CREATE POLICY "Users can view own treatments" ON public.treatments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own treatments" ON public.treatments FOR ALL USING (auth.uid() = user_id);

-- Indici
CREATE INDEX idx_treatments_userid ON public.treatments(user_id);
