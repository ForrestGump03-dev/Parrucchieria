import { X, Bell, Database } from 'lucide-react';
import { type NotificationSettings } from '../hooks/useReminders';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdate: (s: Partial<NotificationSettings>) => void;
}

export default function NotificationSettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdate
}: NotificationSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
           <h2 className="font-bold flex items-center gap-2">
             <Bell size={20} /> Impostazioni Backup
           </h2>
           <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
             <X size={20} />
           </button>
        </div>
        
        <div className="p-6 space-y-6">
           <p className="text-sm text-slate-500">
               Configura gli avvisi di sicurezza per non dimenticare di salvare i tuoi dati.
           </p>

           {/* Backup Section */}
            <div className="space-y-4">
               <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                   <Database size={16} className="text-amber-500" />
                   Promemoria Backup
               </h3>
               
               <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Attiva avviso periodico</span>
                  <input 
                    type="checkbox" 
                    checked={settings.backupReminderEnabled}
                    onChange={(e) => onUpdate({ backupReminderEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
               </div>
               
               {settings.backupReminderEnabled && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                       <label className="block text-sm font-medium text-slate-700 mb-1">
                           Ricordamelo se non faccio backup da:
                       </label>
                       <select 
                            value={settings.backupIntervalDays}
                            onChange={(e) => onUpdate({ backupIntervalDays: Number(e.target.value) })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                       >
                           <option value={7}>7 giorni</option>
                           <option value={14}>14 giorni (consigliato)</option>
                           <option value={30}>30 giorni</option>
                       </select>
                   </div>
               )}
            </div>
        </div>
      </div>
    </div>
  );
}
