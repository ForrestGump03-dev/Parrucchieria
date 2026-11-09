import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Lock, X, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { useReportSecurity, triggerOpenSettings } from '../hooks/useReportSecurity';

interface ReportPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LOCKOUT_STORAGE_KEY = 'root_report_pin_lockout';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

interface LockoutState {
  attempts: number;
  lockUntil: number;
}

function readLockoutState(): LockoutState {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { attempts: 0, lockUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    return {
      attempts: Number(parsed.attempts) || 0,
      lockUntil: Number(parsed.lockUntil) || 0,
    };
  } catch {
    return { attempts: 0, lockUntil: 0 };
  }
}

function writeLockoutState(state: LockoutState) {
  try {
    sessionStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignora errori storage
  }
}

export default function ReportPinModal({ isOpen, onClose, onSuccess }: ReportPinModalProps) {
  const { verifyPin } = useReportSecurity();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lockRemainingSec, setLockRemainingSec] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setDigits(['', '', '', '', '', '']);
    setError(null);
    setVerifying(false);

    const updateCountdown = () => {
      const { lockUntil } = readLockoutState();
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockRemainingSec(remaining);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    // Focus primo input al mount
    const focusTimer = window.setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 50);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = lockRemainingSec > 0;

  const handleDigitChange = (index: number, value: string) => {
    // Solo caratteri numerici
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Se l'utente ha incollato o digitato caratteri multipli
    if (cleanVal.length > 1) {
      const pasteDigits = cleanVal.slice(0, 6).split('');
      const nextDigits = [...digits];
      pasteDigits.forEach((d, i) => {
        if (index + i < 6) nextDigits[index + i] = d;
      });
      setDigits(nextDigits);
      const nextFocus = Math.min(index + pasteDigits.length, 5);
      inputsRef.current[nextFocus]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleanVal[0];
    setDigits(nextDigits);
    setError(null);

    // Auto-advance al successivo
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Se il campo attuale è già vuoto, torna al precedente e cancellalo
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const nextDigits = [...digits];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }
    setDigits(nextDigits);
    setError(null);
    const nextFocus = Math.min(pasteData.length, 5);
    inputsRef.current[nextFocus]?.focus();
  };

  const fullPin = digits.join('');

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) return;

    const currentLock = readLockoutState();
    if (currentLock.lockUntil > Date.now()) {
      const remaining = Math.ceil((currentLock.lockUntil - Date.now()) / 1000);
      setLockRemainingSec(remaining);
      setError(`Troppi tentativi errati. Riprova tra ${remaining} secondi.`);
      return;
    }

    if (fullPin.length !== 6) {
      setError('Inserisci tutte le 6 cifre del PIN');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const isValid = await verifyPin(fullPin);
      if (isValid) {
        writeLockoutState({ attempts: 0, lockUntil: 0 });
        setLockRemainingSec(0);
        onSuccess();
        onClose();
      } else {
        const nextAttempts = currentLock.attempts + 1;
        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
          writeLockoutState({ attempts: 0, lockUntil });
          const remaining = Math.ceil(LOCKOUT_DURATION_MS / 1000);
          setLockRemainingSec(remaining);
          setError(`Troppi tentativi errati. Riprova tra ${remaining} secondi.`);
        } else {
          writeLockoutState({ attempts: nextAttempts, lockUntil: 0 });
          setError(`PIN non corretto. Tentativi rimasti: ${MAX_FAILED_ATTEMPTS - nextAttempts}.`);
        }
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch (err) {
      console.error(err);
      setError('Errore durante la verifica del PIN.');
    } finally {
      setVerifying(false);
    }
  };

  const handleForgotPin = () => {
    onClose();
    triggerOpenSettings('security');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Pulsante chiusura */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Icona */}
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <Lock size={28} />
          </div>

          <h3 className="text-xl font-bold text-slate-800">Area Riservata Admin</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Inserisci il PIN di sicurezza a 6 cifre per visualizzare il fatturato e i dati finanziari.
          </p>

          {/* Form PIN */}
          <form onSubmit={handleSubmit} className="w-full mt-6 space-y-5">
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={isLocked}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold font-mono rounded-xl border transition-all outline-none disabled:opacity-50 ${
                    error || isLocked
                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-400'
                      : digit
                      ? 'border-indigo-600 bg-indigo-50/40 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                      : 'border-slate-300 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200'
                  }`}
                />
              ))}
            </div>

            {(error || isLocked) && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 animate-in fade-in">
                <ShieldAlert size={14} />
                <span>
                  {isLocked
                    ? `Troppi tentativi errati. Riprova tra ${lockRemainingSec}s.`
                    : error}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || isLocked || fullPin.length !== 6}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              {verifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifica in corso...
                </>
              ) : isLocked ? (
                `Bloccato (${lockRemainingSec}s)`
              ) : (
                'Sblocca Dati'
              )}
            </button>
          </form>

          {/* Link PIN dimenticato */}
          <div className="mt-6 pt-4 border-t border-slate-100 w-full flex flex-col items-center gap-1 text-xs">
            <button
              type="button"
              onClick={handleForgotPin}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline inline-flex items-center gap-1.5 transition-colors"
            >
              <KeyRound size={14} />
              Hai dimenticato il PIN? / Cambia PIN
            </button>
            <span className="text-slate-400 text-[11px]">
              (Ti riporterà alle impostazioni di sicurezza previa password)
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
