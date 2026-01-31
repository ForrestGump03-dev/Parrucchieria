import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Lock, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { updateUserPassword } = useAuth();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordFormData>();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const password = watch('password');

  if (!isOpen) return null;

  const onSubmit = async (data: PasswordFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    setSubmitting(true);
    try {
      await updateUserPassword(data.password);
      toast.success('Password aggiornata con successo!');
      onClose();
      reset();
    } catch (error) {
      console.error(error);
      toast.error('Errore aggiornamento password. Assicurati che sia lunga almeno 6 caratteri.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Lock size={20} />
            Cambia Password
          </h2>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nuova Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10 ${errors.password ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Inserisci nuova password"
                {...register('password', { 
                  required: "Password richiesta",
                  minLength: { value: 6, message: "Minimo 6 caratteri" } 
                })}
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Conferma Password</label>
            <input 
              type="password"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Ripeti password"
              {...register('confirmPassword', { 
                required: "Conferma richiesta",
                validate: (val) => val === password || "Le password non coincidono"
              })}
            />
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
             >
               Annulla
             </button>
             <button
               type="submit"
               disabled={submitting}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
             >
               <Save size={18} />
               {submitting ? 'Salvataggio...' : 'Aggiorna Password'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
