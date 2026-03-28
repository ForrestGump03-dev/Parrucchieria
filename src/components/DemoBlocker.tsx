import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DemoBlocker({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || !user.user_metadata?.is_demo) {
    return <>{children}</>;
  }

  const demoStart = new Date(user.user_metadata.demo_start);
  const demoEnd = new Date(demoStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (now < demoStart) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center">
          <ShieldAlert size={48} className="mx-auto text-amber-500 mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">La tua Demo non è ancora attiva</h2>
          <p className="text-slate-600 mb-6 border bg-amber-50 border-amber-200 text-amber-800 p-4 rounded-xl text-sm leading-relaxed">
            Hai richiesto di iniziare il test a partire dal <strong>{demoStart.toLocaleString('it-IT')}</strong>.<br/><br/>
            Torna in quel momento e usa le credenziali per iniziare la tua prova gratuita di 7 giorni.
          </p>
          <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-bold flex items-center justify-center gap-2 w-full">
            <LogOut size={18} /> Esci
          </button>
        </div>
      </div>
    );
  }

  if (now > demoEnd) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center border-t-4 border-indigo-600 relative overflow-hidden">
          <h2 className="text-3xl font-black text-slate-800 mb-2">Demo Scaduta</h2>
          <p className="text-slate-600 mb-8">
            I tuoi 7 giorni di prova gratuita sono terminati. Speriamo che <span className="font-semibold text-indigo-600">Root Salon Manager</span> ti sia piaciuto!
          </p>
          
          <div className="bg-gradient-to-br from-indigo-50 to-fuchsia-50 border border-indigo-100 p-6 rounded-2xl mb-8 relative z-10 shadow-inner">
            <h3 className="font-bold text-indigo-900 mb-2 text-lg">Non vuoi perdere i dati inseriti?</h3>
            <p className="text-sm text-indigo-700 mb-6 leading-relaxed">
              Hai già inserito i tuoi primi clienti e servizi. I tuoi dati sono ancora salvati al sicuro. 
              Passa al piano completo per sbloccare l'accesso permanente!
            </p>
            <a href="https://calendly.com/" target="_blank" rel="noreferrer" className="block w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg text-[15px]">
               Abbonati Ora e Sblocca i Dati
            </a>
          </div>

          <button onClick={handleLogout} className="px-6 py-2 text-slate-400 hover:text-slate-700 transition font-medium text-sm flex items-center justify-center gap-2 mx-auto relative z-10">
            <LogOut size={16} /> Esci dal sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[9999] bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-indigo-500 flex items-center gap-2 cursor-help group">
        <span className="relative flex h-2 w-2">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-100"></span>
        </span>
        Modalità Demo (Scade il {demoEnd.toLocaleDateString('it-IT')})
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-2 w-64 bg-slate-900 text-white text-[11px] p-3 font-normal rounded-lg shadow-xl pointer-events-none">
           Puoi testare tutto. L'accesso verrà automaticamente revocato tra {Math.ceil((demoEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} giorni.
           <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
        </div>
      </div>
      {children}
    </>
  );
}
