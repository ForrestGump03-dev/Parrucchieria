import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, ArrowRight, X, Key, Loader2, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

type Step = 'email' | 'token_and_password';

export default function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors }, setValue: setEmailValue } = useForm<{ email: string }>();
  
  // Combined Form for Token Hash + Password
  const { register: registerCombined, handleSubmit: handleCombinedSubmit, watch, formState: { errors: combinedErrors } } = useForm<{ tokenHash: string, password: string, confirm: string }>();
  const newPassword = watch('password');

  // Sync default email if modal opens
  if (isOpen && !email && defaultEmail) {
    setEmail(defaultEmail);
    setEmailValue('email', defaultEmail);
  }

  if (!isOpen) return null;

const onSendEmail = async (data: { email: string }) => {
  setLoading(true);
  try {
    const cleanEmail = data.email.trim();
    
    // Usiamo la funzione specifica per il RESET
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) throw error;
    
    setEmail(cleanEmail);
    toast.success('Codice di recupero inviato!');
    setStep('token_and_password');
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Errore invio email.';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};

  const onVerifyAndReset = async (data: { tokenHash: string, password: string }) => {
  setLoading(true);
  try {
    // Verifica TOKEN di tipo 'recovery'
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: data.tokenHash.trim(),
      type: 'recovery', // <--- Qui specifichi che è un reset password
    });
    
    if (verifyError) throw new Error("Codice non valido o scaduto.");
    if (!sessionData.session) throw new Error("Verifica fallita.");

    // Aggiorna la password
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: data.password 
    });
    
    if (updateError) throw updateError;
    
    toast.success('Password aggiornata con successo!');
    onClose();
    
  } catch (error) {
    console.error("Errore:", error);
    const message = error instanceof Error ? error.message : 'Errore durante il reset.';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Key size={20} className="text-indigo-400" />
            Recupero Password
          </h2>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* STEP 1: Richiesta Email */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit(onSendEmail)} className="space-y-4">
              <p className="text-slate-600 text-sm">
                Inserisci la tua email. Ti invieremo un codice numerico per reimpostare la password.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email"
                    defaultValue={defaultEmail}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${emailErrors.email ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder="nome@esempio.com"
                    {...registerEmail('email', { required: "Email richiesta" })}
                  />
                </div>
                {emailErrors.email && <p className="text-xs text-red-500">{emailErrors.email.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Invia Codice <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {/* STEP 2: Inserimento Token Hash + Nuova Password */}
          {step === 'token_and_password' && (
            <form 
              onSubmit={handleCombinedSubmit(
                onVerifyAndReset, 
                (errors) => {
                  console.error("Form errors:", errors);
                  toast.error("Compila tutti i campi correttamente.");
                }
              )} 
              className="space-y-4"
            >
              <div className="text-center mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 text-sm">Controlla la tua email</h3>
                <p className="text-xs text-indigo-700 mt-1">Abbiamo inviato un link di recupero a <span className="font-bold">{email}</span></p>
              </div>

              {/* Istruzioni */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <Link2 size={14} /> Come fare:
                </p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Apri l'email ricevuta</li>
                  <li>Copia il <strong>codice a 6 cifre</strong> mostrato</li>
                  <li>Incollalo qui sotto</li>
                </ol>
              </div>

              {/* Token Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">1. Codice di Verifica</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={`w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${combinedErrors.tokenHash ? 'border-red-500' : 'border-slate-300'}`}
                  placeholder="000000"
                  {...registerCombined('tokenHash', { 
                    required: "Codice richiesto",
                    pattern: { value: /^\d{6}$/, message: "Inserisci un codice completo" }
                  })}
                />
                {combinedErrors.tokenHash && <p className="text-xs text-red-500">{combinedErrors.tokenHash.message}</p>}
              </div>

              <div className="h-px bg-slate-200 my-4"></div>

              {/* Password Fields */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">2. Nuova Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${combinedErrors.password ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder="Nuova password"
                    {...registerCombined('password', { 
                        required: "Password richiesta",
                        minLength: { value: 6, message: "Minimo 6 caratteri" }
                    })}
                   />
                </div>
                {combinedErrors.password && <p className="text-xs text-red-500">{combinedErrors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Conferma Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${combinedErrors.confirm ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder="Ripeti password"
                    {...registerCombined('confirm', { 
                        validate: val => val === newPassword || "Le password non coincidono"
                    })}
                   />
                </div>
                {combinedErrors.confirm && <p className="text-xs text-red-500">{combinedErrors.confirm.message}</p>}
              </div>

              <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="showPw" 
                    checked={showPassword} 
                    onChange={e => setShowPassword(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="showPw" className="text-xs text-slate-500 select-none cursor-pointer">Mostra password</label>
               </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-4 shadow-md"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Conferma e Aggiorna Password'}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-slate-400 hover:text-slate-600 text-sm py-2"
              >
                Indietro
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
