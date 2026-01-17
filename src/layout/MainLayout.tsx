import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, History, Scissors } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MainLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Appuntamenti', icon: Calendar },
    { path: '/clients', label: 'Clienti', icon: Users },
    { path: '/history', label: 'Storico', icon: History },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
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
          <div className="text-xs text-slate-500 text-center">
            v1.0.0 &copy; 2026
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
