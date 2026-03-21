import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, Calendar, Users, BarChart3, LogOut, Bell, Lock, Megaphone } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useReminders } from '../hooks/useReminders';
import { useNotifications } from '../context/NotificationContext';
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import NotificationDrawer from '../components/NotificationDrawer';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function MainLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { settings, updateSettings } = useReminders();
  const { unreadCount } = useNotifications();

  // Listen for Password Recovery event to force open the change password modal
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, _session: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordModalOpen(true);
        toast('Imposta una nuova password per completare il recupero.', { icon: '🔑' });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { path: '/', label: 'Agenda', icon: Calendar },
    { path: '/clients', label: 'Clienti & Cassa', icon: Users },
    { path: '/inventory', label: 'Magazzino', icon: Package },
    { path: '/reports', label: 'Report & Analisi', icon: BarChart3 },
    { path: '/marketing', label: 'Marketing & IA', icon: Megaphone },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full p-0.5 overflow-hidden">
            {/* Uso percorso relativo 'logo.png' invece di '/logo.png' per Electron Prod */}
            <img
              src="logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback se logo.png non esiste -> mostra forbici
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>';
              }}
            />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-wide">Root</h1>
            <span className="text-xs text-slate-400 font-medium">Salon Manager</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md font-medium"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-300 hover:bg-slate-800 hover:text-white w-full text-left mt-2"
          >
            <div className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>
            Notifiche
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.email}</div>
              <div className="text-xs text-slate-400">Online</div>
            </div>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm mb-1"
          >
            <Lock size={18} />
            <span>Cambia Password</span>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            Disconnetti
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            v3.0 &copy; 2026
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenSettings={() => {
          setIsDrawerOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
