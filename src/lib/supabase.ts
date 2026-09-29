import {
  createClient,
  navigatorLock,
  NavigatorLockAcquireTimeoutError,
} from '@supabase/supabase-js';

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
    lock: async (name, acquireTimeout, fn) => {
      if (typeof navigator === 'undefined' || !navigator.locks) {
        return await fn();
      }
      try {
        return await navigatorLock(name, acquireTimeout, fn);
      } catch (err: unknown) {
        if (
          acquireTimeout === 0 &&
          (err instanceof NavigatorLockAcquireTimeoutError ||
            (err && typeof err === 'object' && 'isAcquireTimeout' in err))
        ) {
          // Check non bloccante in background (auto-refresh dei token): il lock è momentaneamente
          // occupato da un'altra operazione o scheda, saltiamo questo tick in sicurezza senza errori.
          return undefined as unknown as Awaited<ReturnType<typeof fn>>;
        }
        throw err;
      }
    },
  },
});
