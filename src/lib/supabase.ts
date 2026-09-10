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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Risolve il blocco di navigazione e l'errore NavigatorLockAcquireTimeoutError
    // evitando conflitti con l'API navigator.locks del browser
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    },
  },
});
