import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica credenziali admin senza creare istanze secondarie di GoTrueClient (evita warning in console)
async function checkAdminPassword(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Calcola l'hash SHA-256 del PIN con salt legato all'utente
 */
export async function hashPin(pin: string, userId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${userId}:${pin}:root_salon_report_salt_v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useReportSecurity() {
  const { user } = useAuth();

  const userMeta = user?.user_metadata || {};
  const reportPinHash: string | undefined = userMeta.report_pin_hash;
  const pinSkipped: boolean = Boolean(userMeta.report_pin_skipped);
  const hasPin: boolean = Boolean(reportPinHash);

  /**
   * Verifica se il PIN a 6 cifre fornito corrisponde a quello salvato
   */
  const verifyPin = useCallback(async (inputPin: string): Promise<boolean> => {
    if (!user || !reportPinHash) return false;
    const computed = await hashPin(inputPin, user.id);
    return computed === reportPinHash;
  }, [user, reportPinHash]);

  /**
   * Imposta o aggiorna il PIN a 6 cifre previa verifica della password admin
   */
  const setPin = useCallback(async (
    newPin: string,
    adminPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !user.email) {
      return { success: false, error: 'Utente non autenticato' };
    }

    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'Il PIN deve contenere esattamente 6 numeri' };
    }

    if (!adminPassword) {
      return { success: false, error: 'Inserisci la password attuale del tuo account admin' };
    }

    try {
      // 1. Verifica autenticità con la password admin tramite chiamata fetch diretta
      const isValid = await checkAdminPassword(user.email, adminPassword);
      if (!isValid) {
        return { success: false, error: 'Password admin non corretta. Verifica e riprova.' };
      }

      // 2. Calcola l'hash del nuovo PIN
      const newHash = await hashPin(newPin, user.id);

      // 3. Salva nei metadati dell'utente
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          report_pin_hash: newHash,
          report_pin_skipped: false,
        },
      });

      if (updateError) {
        return { success: false, error: updateError.message || 'Errore durante il salvataggio del PIN' };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto';
      return { success: false, error: msg };
    }
  }, [user]);

  /**
   * Rimuove il PIN previa verifica della password admin
   */
  const removePin = useCallback(async (
    adminPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !user.email) {
      return { success: false, error: 'Utente non autenticato' };
    }

    if (!adminPassword) {
      return { success: false, error: 'Inserisci la password admin per rimuovere il PIN' };
    }

    try {
      // Verifica password admin tramite chiamata fetch diretta
      const isValid = await checkAdminPassword(user.email, adminPassword);
      if (!isValid) {
        return { success: false, error: 'Password admin non corretta.' };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          report_pin_hash: null,
          report_pin_skipped: true,
        },
      });

      if (updateError) {
        return { success: false, error: updateError.message || 'Errore durante la rimozione del PIN' };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto';
      return { success: false, error: msg };
    }
  }, [user]);

  /**
   * Salta la prima configurazione del PIN senza impostarlo
   */
  const skipPinSetup = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      await supabase.auth.updateUser({
        data: {
          report_pin_skipped: true,
        },
      });
    } catch (err) {
      console.error('Errore skip PIN setup:', err);
    }
  }, [user]);

  return {
    hasPin,
    pinSkipped,
    verifyPin,
    setPin,
    removePin,
    skipPinSetup,
  };
}

/**
 * Utility per aprire la modale Impostazioni con una scheda specifica da qualsiasi punto dell'app
 */
export function triggerOpenSettings(tab: 'security' | 'notifications' | 'qrcode' = 'security') {
  window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: { tab } }));
}
