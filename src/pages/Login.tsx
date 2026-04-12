import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, HelpCircle } from 'lucide-react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { Helmet } from 'react-helmet-async';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // 2FA state
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Registrazione completata! Controlla la tua email per la verifica.');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
      
      // se eravamo in login, controlla 2FA
      if (authMode === 'login') {
        // Check if AAL2 (MFA) is required
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        
        const totpFactor = factorsData.totp.find(f => f.status === 'verified');
        
        if (totpFactor) {
          // We need to challenge the user for 2FA
          setRequiresMFA(true);
          setFactorId(totpFactor.id);
          setLoading(false);
          return; // Pause the login flow here
        }
      }
      // If no 2FA required, Auth state change will be caught by AuthContext -> App router
    } catch (e: unknown) {
      console.error(e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      setError(err.message || 'Credenziali non valide o errore di connessione.');
    } finally {
      if (!requiresMFA) setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: mfaCode
      });
      
      if (verify.error) throw verify.error;
      // Success! AuthContext will now pick up the AAL2 session.
    } catch (e: unknown) {
      console.error(e);
      setError('Codice non valido. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const supportLink = isMobile
    ? 'mailto:alessio.forestieri03@gmail.com'
    : 'https://mail.google.com/mail/?view=cm&fs=1&to=alessio.forestieri03@gmail.com';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Helmet>
        <title>Login | Root Salon Manager</title>
      </Helmet>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Brand Header */}
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-24 h-24 bg-transparent mx-auto mb-4 flex items-center justify-center">
             <img src="/splash.png" alt="Root Logo" className="max-w-full max-h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold text-white">Root Salon Manager</h1>
          <p className="text-indigo-200 text-sm mt-2">Versione Beta Gratuita</p>
        </div>

        {/* Tab Switcher */}
        {!requiresMFA && (
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${authMode === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('login'); setError(null); setSuccess(null); }}
            >
              Accedi
            </button>
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${authMode === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('register'); setError(null); setSuccess(null); }}
            >
              Registrati (Beta)
            </button>
          </div>
        )}

        {/* Login Form */}
        <div className="p-8">
           {requiresMFA ? (
             <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in zoom-in duration-300">
               <div className="text-center space-y-2 mb-4">
                 <h2 className="text-lg font-bold text-slate-800">Verifica in Due Passaggi</h2>
                 <p className="text-sm text-slate-500">Inserisci il codice a 6 cifre generato dalla tua app di autenticazione.</p>
               </div>
               
               {error && (
                 <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                   {error}
                 </div>
               )}

               <div className="space-y-2">
                 <div className="relative">
                    <input 
                      type="text" 
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full py-4 text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-2xl tracking-[0.3em] font-bold outline-none"
                      placeholder="000000"
                      required
                      autoFocus
                    />
                 </div>
               </div>

               <button 
                 type="submit" 
                 disabled={loading || mfaCode.length !== 6}
                 className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verifica accesso'}
               </button>
               
               <button 
                 type="button" 
                 onClick={() => { setRequiresMFA(false); setMfaCode(''); }}
                 className="w-full text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
               >
                 Annulla ed esci
               </button>
             </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-200">
                    {success}
                  </div>
                )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                     placeholder="nome@esempio.com"
                     autoComplete="email"
                     required
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="password" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                     placeholder="••••••••"
                     autoComplete="current-password"
                     required
                   />
                </div>
              </div>

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle size={12} />
                    Password dimenticata?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Accedi' : 'Iscriviti Ora')}
              </button>

              {import.meta.env.DEV && authMode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setEmail('test@email.it');
                  setPassword('123');
                }}
                className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-xl font-medium hover:bg-indigo-100 transition-all text-sm"
              >
                Usa Credenziali Demo
              </button>
              )}
           </form>
           )}

           <div className="mt-6 text-center">
             <p className="text-xs text-slate-400">
               Per qualsiasi dubbio <a href={supportLink} target="_blank" rel="noopener noreferrer" className="underline">contatta l'assistenza.</a>
             </p>
           </div>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
        defaultEmail={email}
      />
    </div>
  );
}
