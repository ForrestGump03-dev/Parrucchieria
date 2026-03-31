import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  updateUserPassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
    const checkAndSetSession = async (currentSession: Session | null) => {
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        
        // If user requires AAL2 but only has AAL1, don't set as authenticated yet
        if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession);
          setUser(currentSession.user);
          resetInactivityTimer();
        }
      } catch (err) {
        console.error("Error checking AAL:", err);
        // Fallback safe: force logout if we can't verify 2FA levels
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAndSetSession(session);
    });

    // 2. Listen for changes (login, logout, auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      checkAndSetSession(currentSession);
      if (!currentSession && inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    });

    return () => {
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
    <AuthContext.Provider value={{ session, user, loading, signOut, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
