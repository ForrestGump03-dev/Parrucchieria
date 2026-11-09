import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { type Subscription } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  subscription: null,
  loading: true,
  signOut: async () => {},
  updateUserPassword: async () => {},
});

function isSameUser(a: User | null, b: User | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.updated_at === b.updated_at &&
    JSON.stringify(a.user_metadata ?? {}) === JSON.stringify(b.user_metadata ?? {})
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity timeout logic (60 minutes)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const signOut = useCallback(async () => {
    // Pulisci subito lo stato locale per feedback immediato
    sessionRef.current = null;
    setSession(null);
    setUser(null);
    setSubscription(null);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    try {
      sessionStorage.removeItem('root_report_pin_reminder_shown');
      sessionStorage.removeItem('root_report_pin_lockout');
      localStorage.removeItem('app_notifications');
      window.dispatchEvent(new CustomEvent('auth-signed-out'));
    } catch {
      // Ignora errori se storage non è disponibile
    }
    await supabase.auth.signOut();
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Set for 60 minutes (60 * 60 * 1000)
    inactivityTimerRef.current = setTimeout(() => {
      // Check if session exists before logging out to avoid unnecessary attempts
      if (sessionRef.current) {
        console.log('Logging out due to inactivity');
        void signOut();
      }
    }, 60 * 60 * 1000);
  }, [signOut]);

  useEffect(() => {
    let isActive = true;
    let authStateVersion = 0;
    let authLoadingTimeout: number | null = null;

    const finishAuthLoading = () => {
      if (authLoadingTimeout !== null) {
        window.clearTimeout(authLoadingTimeout);
        authLoadingTimeout = null;
      }
      setLoading(false);
    };

    const clearAuthState = () => {
      sessionRef.current = null;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      setSession(null);
      setUser(null);
      setSubscription(null);
      finishAuthLoading();
    };

    const applyAuthenticatedSession = (currentSession: Session) => {
      sessionRef.current = currentSession;
      setSession(currentSession);
      setUser(prev => (isSameUser(prev, currentSession.user) ? prev : currentSession.user));
      resetInactivityTimer();
      finishAuthLoading();
    };

    // Gli eventi USER_UPDATED, TOKEN_REFRESHED e SIGNED_IN per lo stesso utente già
    // verificato contengono già una sessione valida. Evitare di richiamare altre API
    // Auth in questi listener previene la rientranza sul lock di GoTrue.
    const syncCurrentSession = (currentSession: Session | null) => {
      authStateVersion += 1;

      if (!currentSession) {
        clearAuthState();
        return;
      }

      applyAuthenticatedSession(currentSession);
    };

    const checkAndSetSession = async (currentSession: Session | null) => {
      const requestVersion = ++authStateVersion;

      if (!currentSession) {
        if (isActive && requestVersion === authStateVersion) {
          clearAuthState();
        }
        return;
      }

      const wasAlreadyAuthenticatedSameUser =
        sessionRef.current?.user?.id === currentSession.user.id;

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!isActive || requestVersion !== authStateVersion) return;
        if (error) throw error;
        
        // If user requires AAL2 but only has AAL1, don't set as authenticated yet
        if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
          clearAuthState();
        } else {
          applyAuthenticatedSession(currentSession);
        }
      } catch (err) {
        if (!isActive || requestVersion !== authStateVersion) return;
        console.error("Error checking AAL:", err);
        if (wasAlreadyAuthenticatedSameUser) {
          // Errore transitorio di rete o lock mentre l'utente era già autenticato:
          // preserviamo la sessione senza forzare un logout distruttivo.
          applyAuthenticatedSession(currentSession);
          return;
        }
        // Fallback safe al primo login se non è possibile verificare il livello 2FA
        clearAuthState();
        return;
      }
    };

    // Se il browser non riesce a raggiungere Supabase (VPN, proxy o rete offline),
    // getSession può restare in attesa del refresh token: non lasciamo l'app bloccata.
    authLoadingTimeout = window.setTimeout(() => {
      if (!isActive) return;
      authStateVersion += 1;
      console.error('Timeout durante il ripristino della sessione Auth');
      if (!sessionRef.current) {
        clearAuthState();
      } else {
        finishAuthLoading();
      }
    }, 12000);

    // 1. Check active session on load
    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => checkAndSetSession(initialSession))
      .catch((err: unknown) => {
        console.error('Error restoring session:', err);
        if (isActive && !sessionRef.current) clearAuthState();
      });

    // 2. Listen for changes (login, logout, auto-refresh)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED' ||
        (event === 'SIGNED_IN' &&
          currentSession !== null &&
          sessionRef.current?.user?.id === currentSession.user.id)
      ) {
        syncCurrentSession(currentSession);
        return;
      }

      setTimeout(() => {
        if (isActive) void checkAndSetSession(currentSession);
      }, 0);
    });

    // 3. Quando la rete torna online (es. risveglio PC da standby), verifica che il token sia fresco
    const handleOnline = () => {
      const current = sessionRef.current;
      if (!current) return;
      const expiresAtMs = (current.expires_at ?? 0) * 1000;
      if (expiresAtMs - Date.now() < 90_000) {
        void supabase.auth.refreshSession().then(({ data }) => {
          if (isActive && data.session) {
            applyAuthenticatedSession(data.session);
          }
        }).catch((err: unknown) => {
          console.warn('Refresh session on reconnect failed:', err);
        });
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isActive = false;
      authStateVersion += 1;
      authSub.unsubscribe();
      window.removeEventListener('online', handleOnline);
      if (authLoadingTimeout !== null) window.clearTimeout(authLoadingTimeout);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  useEffect(() => {
    if (!session) return; // Only track activity if user is logged in
    
    // Throttled reset function to avoid high CPU usage
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        resetInactivityTimer();
        throttleTimeout = null;
      }, 5000); // Only reset timer max once every 5 seconds
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [session, resetInactivityTimer]);

  const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, subscription, loading, signOut, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
