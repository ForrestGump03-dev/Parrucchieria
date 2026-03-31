import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Lock, Save, Eye, EyeOff, Shield, Bell, Database, Users, AlertTriangle, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useReminders } from '../hooks/useReminders';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'security' | 'notifications';
}

interface PasswordFormData {
  password?: string;
  confirmPassword?: string;
  currentPassword?: string;
}

export default function SettingsModal({ isOpen, onClose, initialTab = 'security' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'security' | 'notifications'>(initialTab);
  const { updateUserPassword, session } = useAuth();
  const { settings, updateSettings } = useReminders();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordFormData>();
  
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);

  const password = watch('password');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      checkMFAStatus();
    }
  }, [isOpen, initialTab]);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totpFactor = data.totp.find(f => f.status === 'verified');
      if (totpFactor) {
        setIs2FAEnabled(true);
        setFactorId(totpFactor.id);
      } else {
        setIs2FAEnabled(false);
        setFactorId(null);
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
    }
  };

  if (!isOpen) return null;

  // --- PASSWORD UPDATE ---
  const onSubmitPassword = async (data: PasswordFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }
    if (!data.password) return;

    setSubmittingPassword(true);
    try {
      await updateUserPassword(data.password);
      toast.success('Password aggiornata con successo!');
      reset();
    } catch (error: unknown) {
      console.error(error);
      toast.error('Errore aggiornamento password. Assicurati che sia lunga almeno 6 caratteri.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  // --- 2FA LOGIC ---
  const handleEnable2FA = async () => {
    setLoading2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setIsSettingUp2FA(true);
    } catch (err: unknown) {
      console.error('Error enabling 2FA:', err);
      toast.error('Errore durante la generazione del codice 2FA.');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!factorId || !verifyCode) return;
    setLoading2FA(true);
    try {
       const challenge = await supabase.auth.mfa.challenge({ factorId });
       if (challenge.error) throw challenge.error;
       
       const verify = await supabase.auth.mfa.verify({
         factorId,
         challengeId: challenge.data.id,
         code: verifyCode
       });
       
       if (verify.error) throw verify.error;
       
       toast.success('Autenticazione a Due Fattori abilitata!');
       setIs2FAEnabled(true);
       setIsSettingUp2FA(false);
       setQrCode(null);
       setVerifyCode('');
    } catch (err: unknown) {
       console.error('Error verifying 2FA:', err);
       toast.error('Codice non valido. Riprova.');
    } finally {
       setLoading2FA(false);
    }
  };

  const handleDisable2FA = async (data: PasswordFormData) => {
    if (!factorId || !data.currentPassword) return;
    setLoading2FA(true);
    try {
      // First, re-authenticate to verify the password before disabling 2FA
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || '',
        password: data.currentPassword
      });

      if (signInError) throw new Error('Password errata');

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;

      toast.success('Autenticazione a Due Fattori disabilitata');
      setIs2FAEnabled(false);
      setFactorId(null);
      setIsDisabling2FA(false);
      reset({ currentPassword: '' });
    } catch (err: unknown) {
       console.error('Error disabling 2FA:', err);
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       toast.error((err as any).message || 'Errore durante la disattivazione. Verifica la password.');
    } finally {
       setLoading2FA(false);
    }
  };

  const cancelSetup2FA = async () => {
    if (factorId && !is2FAEnabled) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setIsSettingUp2FA(false);
    setFactorId(null);
    setQrCode(null);
    setVerifyCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-auto max-h-[800px] animate-in fade-in zoom-in duration-200">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 flex-none h-auto">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Impostazioni</h2>
            <button onClick={onClose} className="md:hidden text-slate-500 hover:bg-slate-200 p-1 rounded-full"><X size={20}/></button>
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-x-auto md:overflow-y-auto flex md:flex-col shrink-0">
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors shrink-0 text-sm font-medium w-full text-left ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Shield size={18} /> Sicurezza
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors shrink-0 text-sm font-medium w-full text-left ${activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Bell size={18} /> Notifiche & Backup
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          <button 
            onClick={onClose}
            className="hidden md:block absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          {activeTab === 'security' && (
            <div className="p-6 md:p-8 space-y-10">
              {/* Password Section */}
              <section>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <Lock size={20} className="text-indigo-600" /> Cambia Password
                  </h3>
                  <p className="text-sm text-slate-500">Aggiorna la tua password di accesso.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4 max-w-sm">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Nuova Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10 ${errors.password ? 'border-red-500' : 'border-slate-300'}`}
                        placeholder="Inserisci nuova password"
                        {...register('password', { minLength: { value: 6, message: "Minimo 6 caratteri" } })}
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Conferma Password</label>
                    <input 
                      type="password"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300'}`}
                      placeholder="Ripeti password"
                      {...register('confirmPassword', { 
                        validate: (val) => {
                          if (!password && !val) return true;
                          return val === password || "Le password non coincidono";
                        }
                      })}
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPassword || !password}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full"
                  >
                    {submittingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {submittingPassword ? 'Salvataggio...' : 'Aggiorna Password'}
                  </button>
                </form>
              </section>

              {/* 2FA Section */}
              <section className="border-t border-slate-100 pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <Smartphone size={20} className="text-indigo-600" /> Autenticazione a Due Fattori (2FA)
                  </h3>
                  <p className="text-sm text-slate-500">Proteggi il tuo account con un codice aggiuntivo generato dal tuo telefono.</p>
                </div>

                {is2FAEnabled ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 text-emerald-800 space-y-4">
                    <div className="flex items-center gap-3 border-b border-emerald-200/50 pb-4">
                       <CheckCircle2 size={24} className="text-emerald-600" />
                       <div>
                         <h4 className="font-semibold text-emerald-900">2FA Attiva</h4>
                         <p className="text-sm text-emerald-700">Il tuo account è protetto dall'autenticazione a due fattori.</p>
                       </div>
                    </div>
                    
                    {isDisabling2FA ? (
                      <form onSubmit={handleSubmit(handleDisable2FA)} className="space-y-3 pt-2">
                        <p className="text-sm font-medium text-emerald-900">Per disattivare la 2FA, inserisci la tua password attuale:</p>
                        <input 
                          type="password"
                          className="w-full max-w-sm px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="Password attuale"
                          {...register('currentPassword', { required: true })}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsDisabling2FA(false)}
                            className="px-4 py-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Annulla
                          </button>
                          <button
                            type="submit"
                            disabled={loading2FA}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex flex-center gap-2 disabled:opacity-50"
                          >
                            {loading2FA ? <Loader2 size={16} className="animate-spin" /> : null}
                            Conferma Disattivazione
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsDisabling2FA(true)}
                        className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        Disattiva 2FA
                      </button>
                    )}
                  </div>
                ) : isSettingUp2FA ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5">
                    <h4 className="font-semibold text-slate-800">1. Scansiona il QR Code</h4>
                    <p className="text-sm text-slate-600">Apri la tua app di autenticazione (es. Google Authenticator) e inquadra il codice QR qui sotto:</p>
                    
                    {qrCode && (
                       <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block">
                         <div dangerouslySetInnerHTML={{ __html: qrCode }} className="w-40 h-40" />
                       </div>
                    )}

                    <h4 className="font-semibold text-slate-800 pt-2 border-t border-slate-200">2. Inserisci il codice</h4>
                    <div className="flex max-w-sm gap-2">
                       <input 
                         type="text"
                         value={verifyCode}
                         onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                         className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center tracking-[0.5em] font-mono font-bold text-lg"
                         placeholder="000000"
                       />
                       <button
                         onClick={handleVerify2FA}
                         disabled={loading2FA || verifyCode.length !== 6}
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                       >
                         {loading2FA ? <Loader2 size={18} className="animate-spin" /> : 'Verifica e Attiva'}
                       </button>
                    </div>
                    <button
                        onClick={cancelSetup2FA}
                        className="text-sm text-slate-500 hover:text-slate-800 hover:underline pt-2 inline-block"
                      >
                        Annulla configurazione
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={handleEnable2FA}
                      disabled={loading2FA}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-4"
                    >
                      {loading2FA ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                      Attiva 2FA
                    </button>
                  </div>
                )}

                {/* Emergency Banner */}
                <div className="mt-6 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                  <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">Dispositivo smarrito? Contatta l'assistenza</p>
                    <p>Invia un'email a <strong>alessio.forestieri03@gmail.com</strong> includendo Nome, Cognome e il tuo numero di telefono per essere ricontattato. Il team di supporto ti richiamerà per verificare la tua identità tramite voce prima di sbloccare l'account o disattivare la 2FA dal database.</p>
                  </div>
                </div>

              </section>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6 md:p-8 space-y-8 max-w-xl">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <Bell size={20} className="text-indigo-600" /> Impostazioni Backup
                 </h3>
                 <p className="text-sm text-slate-500">Configura gli avvisi di sicurezza per non dimenticare di salvare i tuoi dati.</p>
               </div>

                <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                   <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                       <Database size={16} className="text-amber-500" />
                       Promemoria Backup
                   </h4>
                   
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Attiva avviso periodico</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.backupReminderEnabled}
                          onChange={(e) => updateSettings({ backupReminderEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                   </div>
                   
                   {settings.backupReminderEnabled && (
                       <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
                           <label className="block text-sm font-medium text-slate-700 mb-1">
                               Ricordamelo se non faccio backup da:
                           </label>
                           <select 
                                value={settings.backupIntervalDays}
                                onChange={(e) => updateSettings({ backupIntervalDays: Number(e.target.value) })}
                                className="w-full max-w-xs p-2 border border-slate-300 rounded-lg text-sm bg-white"
                           >
                               <option value={7}>7 giorni</option>
                               <option value={14}>14 giorni (consigliato)</option>
                               <option value={30}>30 giorni</option>
                           </select>
                       </div>
                   )}
                </div>

                <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                   <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                       <Users size={16} className="text-amber-500" />
                       Scadenza Clienti da Recuperare
                   </h4>
                   
                   <div className="flex md:items-center flex-col md:flex-row justify-between gap-3">
                      <span className="text-sm text-slate-600 pr-2">Mostra i clienti che non prenotano da:</span>
                      <select 
                           value={settings.winbackDays || 60}
                           onChange={(e) => updateSettings({ winbackDays: Number(e.target.value) })}
                           className="w-full md:w-1/3 p-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                      >
                          <option value={30}>30 giorni</option>
                          <option value={60}>60 giorni</option>
                          <option value={90}>90 giorni</option>
                          <option value={120}>120 giorni</option>
                      </select>
                   </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}