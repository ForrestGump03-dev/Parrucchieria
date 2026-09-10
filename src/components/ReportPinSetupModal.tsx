import { useState, type FormEvent } from 'react';
import { ShieldCheck, X, Eye, EyeOff, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { useReportSecurity } from '../hooks/useReportSecurity';
import toast from 'react-hot-toast';

interface ReportPinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportPinSetupModal({ isOpen, onClose, onSuccess }: ReportPinSetupModalProps) {
  const { setPin, skipPinSetup } = useReportSecurity();
  const [adminPassword, setAdminPassword] = useState('');
  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminPassword) {
      setError('Inserisci la password del tuo account per confermare la tua identità.');
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('Il PIN deve essere composto da 6 numeri.');
      return;
    }

    if (pin !== confirmPin) {
      setError('I due PIN inseriti non coincidono.');
      return;
    }

    setLoading(true);
    const result = await setPin(pin, adminPassword);
    setLoading(false);

    if (result.success) {
      toast.success('PIN di sicurezza impostato con successo!');
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Errore durante il salvataggio del PIN.');
    }
  };

  const handleSkip = async () => {
    await skipPinSetup();
    sessionStorage.setItem('root_report_pin_reminder_shown', 'true');
    toast('Configurazione saltata. I dati sono visibili. Puoi impostare un PIN in qualunque momento in Impostazioni > Sicurezza.', {
      icon: 'ℹ️',
      duration: 5000,
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
            <ShieldCheck size={28} />
          </div>

          <h3 className="text-xl font-bold text-slate-800">Protezione Fatturato</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Imposta un PIN a 6 cifre per nascondere incassi e metriche finanziarie quando il gestionale è aperto in salone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Password Admin */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Account Admin
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Inserisci la password di accesso al gestionale"
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Necessaria per autorizzare la configurazione.</p>
          </div>

          {/* Nuovo PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nuovo PIN (6 cifre numeriche)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPinState(val);
                setError(null);
              }}
              placeholder="Es. 123456"
              className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {/* Conferma PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Conferma PIN (6 cifre)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setConfirmPin(val);
                setError(null);
              }}
              placeholder="Ripeti il PIN"
              className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || confirmPin.length !== 6 || !adminPassword}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Salva PIN e Mostra Dati
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-colors text-xs text-center"
            >
              Salta per ora (mostra senza PIN)
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
