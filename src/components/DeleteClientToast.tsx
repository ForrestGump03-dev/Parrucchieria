import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteClientToastProps {
  isVisible: boolean;
  clientName: string;
  onConfirm: () => void;
  onClose: () => void;
  duration?: number;
}

export default function DeleteClientToast({ isVisible, clientName, onConfirm, onClose, duration = 5000 }: DeleteClientToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    if (!isVisible) return;
    setTimeLeft(duration / 1000);
    
    // Timer for countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Timer for auto-close
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [isVisible, duration]); // Removed onClose from dependency to avoid loop if reference changes

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-white rounded-lg shadow-2xl border border-slate-200 p-4 w-80 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-slate-800">Eliminare anche il cliente?</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Hai eliminato l'appuntamento. Vuoi rimuovere definitivamente anche <strong>{clientName}</strong>?
      </p>
      <div className="flex gap-2">
        <button 
          onClick={onConfirm}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          Elimina ({Math.ceil(timeLeft)}s)
        </button>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          Ignora
        </button>
      </div>
      {/* Progress bar visual */}
      <div className="absolute bottom-0 left-0 h-1 bg-red-100 w-full rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-red-500 transition-all ease-linear"
          style={{ 
            width: `${(timeLeft / (duration / 1000)) * 100}%`, 
            transitionDuration: '1000ms' 
          }}
        />
      </div>
    </div>
  );
}
