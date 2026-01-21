import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Scissors, BarChart3, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Agenda', icon: Calendar },
    { path: '/clients', label: 'Clienti & Cassa', icon: Users },
    { path: '/reports', label: 'Report & Analisi', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Gestionale</h1>
            <span className="text-xs text-slate-400">Parrucchieria</span>
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
             onClick={signOut} 
             className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-colors text-sm"
           >
             <LogOut size={18} />
             Disconnetti
           </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            v1.0.1 &copy; 2026
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
