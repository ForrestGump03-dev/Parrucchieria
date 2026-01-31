import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, CheckCircle, ArrowRight, X, Key, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

type Step = 'email' | 'otp' | 'newPassword';

export default function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<{ email: string }>({
    defaultValues: { email: defaultEmail }
  });
  
  const { register: registerOtp, handleSubmit: handleOtpSubmit, formState: { errors: otpErrors } } = useForm<{ token: string }>();
  
  const { register: registerPw, handleSubmit: handlePwSubmit, watch, formState: { errors: pwErrors } } = useForm<{ password: string, confirm: string }>();
  const newPassword = watch('password');

  if (!isOpen) return null;

  const onSendEmail = async (data: { email: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email);
      if (error) throw error;
      
      setEmail(data.email);
      toast.success('Codice inviato! Controlla la tua email.');
      setStep('otp');
    } catch (error) {
      console.error(error);
      toast.error('Errore invio email. Verifica l\'indirizzo.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data: { token: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: data.token,
        type: 'recovery',
      });
      
      if (error) throw error;
      
      toast.success('Codice verificato! Imposta la nuova password.');
      setStep('newPassword');
    } catch (error) {
      console.error(error);
      toast.error('Codice non valido o scaduto.');
    } finally {
      setLoading(false);
    }
  };

  const onUpdatePassword = async (data: { password: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      
      toast.success('Password aggiornata con successo! Ora puoi accedere.');
      onClose();
      // Optional: auto login happens because updateUser updates the session, 
      // but in 'recovery' mode verifyOtp logs the user in.
    } catch (error) {
      console.error(error);
      toast.error('Errore aggiornamento password.');
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

          {/* STEP 2: Inserimento OTP */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit(onVerifyOtp)} className="space-y-4">
              <div className="text-center mb-2">
                <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-600">
                  <Mail size={24} />
                </div>
                <h3 className="font-semibold text-slate-800">Email Inviata!</h3>
                <p className="text-xs text-slate-500">Abbiamo inviato un codice a <span className="font-bold">{email}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Codice di verifica (OTP)</label>
                <input 
                  type="text"
                  className={`w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${otpErrors.token ? 'border-red-500' : 'border-slate-300'}`}
                  placeholder="123456"
                  maxLength={6}
                  {...registerOtp('token', { required: "Codice richiesto" })}
                />
                {otpErrors.token && <p className="text-xs text-red-500">{otpErrors.token.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verifica Codice'}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-slate-400 hover:text-slate-600 text-sm py-1"
              >
                Indietro / Non ho ricevuto l'email
              </button>
            </form>
          )}

          {/* STEP 3: Nuova Password */}
          {step === 'newPassword' && (
            <form onSubmit={handlePwSubmit(onUpdatePassword)} className="space-y-4">
               <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <CheckCircle size={18} />
                  Codice verificato correttamente.
               </div>
               
               <p className="text-slate-600 text-sm mb-2">Scegli la tua nuova password</p>

               <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nuova Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${pwErrors.password ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder="Nuova password"
                    {...registerPw('password', { 
                        required: "Password richiesta",
                        minLength: { value: 6, message: "Minimo 6 caratteri" }
                    })}
                   />
                </div>
                {pwErrors.password && <p className="text-xs text-red-500">{pwErrors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Conferma Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    type="password"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${pwErrors.confirm ? 'border-red-500' : 'border-slate-300'}`}
                    placeholder="Ripeti password"
                    {...registerPw('confirm', { 
                        validate: val => val === newPassword || "Le password non coincidono"
                    })}
                   />
                </div>
                {pwErrors.confirm && <p className="text-xs text-red-500">{pwErrors.confirm.message}</p>}
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Aggiorna Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
