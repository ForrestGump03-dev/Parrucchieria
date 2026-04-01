import { useAuth } from '../context/AuthContext';
import { LogOut, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export default function SubscriptionBlocker({ children }: { children: React.ReactNode }) {
  const { user, subscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!user) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = async (priceId: string) => {
    setLoadingPlan(priceId);
    try {
      // Invocheremo una Edge Function per creare la sessione di Checkout
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Errore durante la creazione del checkout:', error);
      alert("C'è stato un problema di connessione al Checkout. Stiamo configurando l'infrastruttura, riprova tra poco.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const isBlocked = subscription && ['trial_expired', 'past_due', 'canceled'].includes(subscription.status);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 min-h-screen bg-slate-900 flex items-center justify-center p-4 z-[9999] overflow-y-auto">
        <div className="max-w-4xl w-full bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden text-center z-10 my-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">La tua demo è terminata.</h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto">
            Speriamo che Root Salon Manager ti sia piaciuto! I tuoi dati sono salvi. Scegli un piano per sbloccare l'accesso permanente e continuare a far crescere il tuo salone.
          </p>

          <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto z-20">
            {/* Piano Mensile */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Piano Mensile</h3>
                <p className="text-slate-400 text-sm mt-2">La flessibilità di pagare mese per mese.</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-black">29€</span>
                <span className="text-slate-500"> / mese</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Smart Booking & Gestione Risorse</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> WhatsApp Web</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Magazzino & Statistiche</li>
              </ul>
              <button 
                onClick={() => handleCheckout('price_1THQZ4Q3DnW2hP9tA4pQcQfZ')} 
                disabled={loadingPlan !== null}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50"
              >
                {loadingPlan === 'price_1THQZ4Q3DnW2hP9tA4pQcQfZ' ? 'Creazione in corso...' : 'Sblocca a 29€ / mese'}
              </button>
            </div>

            {/* Piano Annuale */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 flex flex-col relative border-4 border-indigo-600 mt-8 md:mt-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                2 MESI IN REGALO
              </div>
              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-bold">Piano Annuale</h3>
                <p className="text-slate-500 text-sm mt-2">Massimo risparmio per far crescere il tuo salone.</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-black">290€</span>
                <span className="text-slate-500"> / anno</span>
                <p className="text-sm text-indigo-600 font-bold mt-1">Soli 24,16€ al mese</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-slate-700">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-indigo-500" /> <span className="font-bold">Tutto ciò che c'è nel mensile</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Algoritmo Win-Back Clienti</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Accesso future funzionalità</li>
              </ul>
              <button 
                onClick={() => handleCheckout('price_1THQZAQ3DnW2hP9tlGaHw6hK')} 
                disabled={loadingPlan !== null}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 shadow-xl"
              >
                 {loadingPlan === 'price_1THQZAQ3DnW2hP9tlGaHw6hK' ? 'Creazione in corso...' : 'Sblocca a 290€ / anno'}
              </button>
            </div>
          </div>

          <button onClick={handleLogout} className="mt-12 px-6 py-2 text-slate-500 hover:text-slate-300 transition font-medium text-sm flex items-center justify-center gap-2 mx-auto">
            <LogOut size={16} /> Esci dal sistema
          </button>
        </div>
      </div>
    );
  }

  // Floating badge per il trial (mostrato solo se è trialing)
  const isTrial = subscription && subscription.status === 'trialing';
  let daysLeft = 7;
  if (isTrial && subscription?.current_period_end) {
    const end = new Date(subscription.current_period_end).getTime();
    const now = new Date().getTime();
    daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <>
      {isTrial && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-fuchsia-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-fuchsia-500 flex items-center gap-2 cursor-help group">
          <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-300 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-100"></span>
          </span>
          {daysLeft > 0 ? `Modalità Demo (${daysLeft} giorni rimanenti)` : 'Ultimo giorno di Demo!'}
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-2 w-64 bg-slate-900 text-white text-[11px] p-3 font-normal rounded-lg shadow-xl pointer-events-none">
             Al termine della prova il gestionale verrà bloccato. Attiva un abbonamento per sbloccarne l'uso.
             <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
