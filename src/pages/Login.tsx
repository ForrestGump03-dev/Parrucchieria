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
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Auth state change will be caught by AuthContext -> App router
    } catch (e: unknown) {
      console.error(e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      setError(err.message || 'Credenziali non valide o errore di connessione.');
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
          <p className="text-indigo-200 text-sm mt-2">Accedi al tuo spazio di lavoro</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
           <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                  {error}
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

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Accedi'}
              </button>

              {import.meta.env.DEV && (
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
