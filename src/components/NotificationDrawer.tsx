import { X, CheckCheck, Trash2, Settings, Bell, Database } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function NotificationDrawer({ isOpen, onClose, onOpenSettings }: NotificationDrawerProps) {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Bell className="text-indigo-600" size={20} />
            Centro Notifiche
          </h2>
          <div className="flex items-center gap-1">
             <button 
                onClick={onOpenSettings}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                title="Impostazioni Notifiche"
             >
                <Settings size={20} />
             </button>
             <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
             >
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Bell size={48} className="opacity-20" />
                <p>Nessuna notifica</p>
             </div>
           ) : (
             notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    n.read 
                      ? 'bg-slate-50 border-slate-100 opacity-60' 
                      : 'bg-white border-indigo-100 shadow-sm hover:border-indigo-300'
                  }`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                         {n.type === 'backup' && <Database size={14} className="text-amber-500" />}
                         {n.type === 'info' && <Bell size={14} className="text-indigo-500" />}
                         <span className={`text-xs font-bold uppercase tracking-wider ${
                            n.read ? 'text-slate-400' : 'text-indigo-600'
                         }`}>
                           {n.type === 'backup' ? 'Sistema' : 'Agenda'}
                         </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {format(n.timestamp, 'dd MMM HH:mm', { locale: it })}
                      </span>
                   </div>
                   
                   <h3 className={`font-medium mb-1 ${n.read ? 'text-slate-600' : 'text-slate-800'}`}>
                      {n.title}
                   </h3>
                   <p className="text-sm text-slate-500 leading-relaxed">
                      {n.message}
                   </p>
                   
                   {!n.read && (
                     <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full" />
                   )}
                   
                   <button 
                      onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                      className="absolute bottom-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
             ))
           )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
           <div className="p-4 border-t border-slate-100 flex gap-2">
              <button 
                onClick={markAllAsRead}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCheck size={16} /> Segna tutte lette
              </button>
              <button 
                onClick={clearAll}
                className="py-2 px-3 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                title="Cancella tutto"
              >
                <Trash2 size={18} />
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
