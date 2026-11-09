import { createClient, type Session } from '@supabase/supabase-js';

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

/**
 * Garantisce che ci sia una sessione autenticata con un access_token valido prima di
 * eseguire query protette da RLS. Impedisce a @supabase/supabase-js di ripiegare
 * silenziosamente sulla chiave `anon` quando il refresh del token fallisce per un
 * errore di rete transitorio (es. risveglio del PC dallo standby), evitando che
 * PostgREST restituisca `data: []` (HTTP 200) svuotando l'interfaccia.
 */
export async function ensureAuthenticatedSession(): Promise<Session> {
  const { data: { session }, error } = await supabase.auth.getSession();
  const nowMs = Date.now();

  if (!error && session?.access_token) {
    const expiresAtMs = (session.expires_at ?? 0) * 1000;
    if (expiresAtMs === 0 || expiresAtMs - nowMs > 5_000) {
      return session;
    }
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    return refreshed.session;
  }

  throw new Error(
    refreshError?.message ||
    error?.message ||
    'Sessione temporaneamente non disponibile. Verifica la connessione di rete.'
  );
}
