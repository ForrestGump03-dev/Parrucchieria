import { createClient } from '@supabase/supabase-js';

// Queste variabili d'ambiente devono essere impostate nel file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const msg = 'Mancano le variabili d\'ambiente di Supabase! Assicurati di aver creato il file .env e di aver riavviato il server (npm run dev).';
  console.error(msg);
  alert(msg);
  throw new Error(msg);
}

// Manteniamo il lock nativo gestito da Supabase: una sua sostituzione deve sempre
// rispettare il contratto della libreria e non può trasformare un lock non acquisito
// in un risultato valido. I listener Auth vengono invece deferiti in AuthContext.
export const supabase = createClient(supabaseUrl, supabaseKey);
