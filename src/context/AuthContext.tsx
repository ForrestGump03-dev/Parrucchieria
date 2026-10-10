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
    setSession(null);
    setUser(null);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    try {
      sessionStorage.removeItem('root_report_pin_reminder_shown');
    } catch {
      // Ignora errori se sessionStorage non è disponibile
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
        signOut();
      }
    }, 60 * 60 * 1000);
  }, [signOut]);

  useEffect(() => {
    let isActive = true;
    let authStateVersion = 0;

    const clearAuthState = () => {
      sessionRef.current = null;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      setSession(null);
      setUser(null);
      setSubscription(null);
      setLoading(false);
    };

    // Gli eventi USER_UPDATED e TOKEN_REFRESHED contengono già una sessione valida.
    // Evitare di richiamare altre API Auth in questi listener previene la rientranza
    // sul lock di GoTrue e rende subito disponibile il nuovo metadata del PIN.
    const syncCurrentSession = (currentSession: Session | null) => {
      authStateVersion += 1;

      if (!currentSession) {
        clearAuthState();
        return;
      }

      sessionRef.current = currentSession;
      setSession(currentSession);
      setUser(currentSession.user);
      resetInactivityTimer();
      setLoading(false);
    };

    const checkAndSetSession = async (currentSession: Session | null) => {
      const requestVersion = ++authStateVersion;

      if (!currentSession) {
        if (isActive && requestVersion === authStateVersion) {
          clearAuthState();
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!isActive || requestVersion !== authStateVersion) return;
        if (error) throw error;
        
        // If user requires AAL2 but only has AAL1, don't set as authenticated yet
        if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
          clearAuthState();
        } else {
          sessionRef.current = currentSession;
          setSession(currentSession);
          setUser(currentSession.user);
          resetInactivityTimer();
          setSubscription(null);

          // Fetch subscription data
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .single();

          if (isActive && requestVersion === authStateVersion && !subError && subData) {
            setSubscription(subData);
          }
        }
      } catch (err) {
        if (!isActive || requestVersion !== authStateVersion) return;
        console.error("Error checking AAL:", err);
        // Fallback safe: force logout if we can't verify 2FA levels
        clearAuthState();
        return;
      }

      if (isActive && requestVersion === authStateVersion) {
        setLoading(false);
      }
    };

    // 1. Check active session on load
    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => checkAndSetSession(session))
      .catch((err: unknown) => {
        console.error('Error restoring session:', err);
        if (isActive) setLoading(false);
      });

    // 2. Listen for changes (login, logout, auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        syncCurrentSession(currentSession);
        return;
      }

      setTimeout(() => {
        if (isActive) void checkAndSetSession(currentSession);
      }, 0);

    });

    return () => {
      isActive = false;
      authStateVersion += 1;
      subscription.unsubscribe();
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
