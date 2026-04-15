import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, Calendar, Users, BarChart3, LogOut, Bell, Settings as SettingsIcon, Megaphone, Menu, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../context/NotificationContext';
import SettingsModal from '../components/SettingsModal';
import NotificationDrawer from '../components/NotificationDrawer';
import FeedbackModal from '../components/FeedbackModal';

export default function MainLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'security' | 'notifications'>('security');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { unreadCount } = useNotifications();

  // Listen for Password Recovery event to force open the change password modal
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSettingsTab('security');
        setIsSettingsOpen(true);
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
  ];

  // No need for location.pathname effect here since we added onClick to nav links

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-slate-900 text-white flex flex-col shadow-xl absolute md:relative z-50 h-full transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full p-0.5 overflow-hidden">
            <img
              src="/logo.png"
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
          <button 
             className="md:hidden ml-auto p-1 text-slate-400 hover:text-white"
             onClick={() => setIsMobileMenuOpen(false)}
          >
             <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
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
            onClick={() => setIsFeedbackOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-indigo-400 font-medium hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm mb-1"
          >
            <Megaphone size={18} />
            <span>Invia Feedback</span>
          </button>

          <button
            onClick={() => {
              setSettingsTab('security');
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm mb-1"
          >
            <SettingsIcon size={18} />
            <span>Impostazioni</span>
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
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col h-full w-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-0.5 overflow-hidden">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold">Root Manager</span>
          </div>
          <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenSettings={() => {
          setIsDrawerOpen(false);
          setSettingsTab('notifications');
          setIsSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
