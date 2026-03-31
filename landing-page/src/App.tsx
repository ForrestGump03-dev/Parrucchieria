import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Target, SplitSquareHorizontal, CalendarRange, Clock, X, Loader2 } from 'lucide-react';

function App() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                Root Salon Manager
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-indigo-600 font-medium">Funzionalità</a>
              <a href="#pricing" className="text-slate-600 hover:text-indigo-600 font-medium">Prezzi</a>
              <a href="https://app.rootfix.app/login" className="text-slate-600 hover:text-indigo-600 font-bold transition">
                Accedi
              </a>
              <button onClick={() => setIsDemoModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-indigo-700 transition shadow-sm">
                Provalo per 7 giorni
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-100 text-fuchsia-700 font-semibold text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
            </span>
            Root Salon Manager: Il Software per Parrucchieri
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Risolvi i problemi del tuo salone <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">alla radice.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
            Il gestionale che azzera i "No-Show", organizza perfettamente la tua agenda e fa tornare i clienti persi. Senza nessuna commissione nascosta o portali intermediari.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button onClick={() => setIsDemoModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold text-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2">
              Provalo per 7 Giorni <ArrowRight size={20} />
            </button>
            <a href="#features" className="bg-white text-slate-700 border border-slate-300 px-8 py-3.5 rounded-full font-bold text-lg hover:bg-slate-50 transition flex items-center justify-center">
              Scopri le Funzionalità
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-1.5"><CheckCircle2 size={18} className="text-emerald-500" /> Nessuna carta richiesta</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={18} className="text-emerald-500" /> Nessun vincolo</div>
          </div>
        </div>
        <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-3xl transform rotate-3 scale-105 opacity-20 blur-xl"></div>
          <img 
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000" 
            alt="Salone Parrucchiere" 
            className="relative rounded-3xl shadow-2xl border border-white/20 object-cover aspect-square sm:aspect-video lg:aspect-square"
          />
        </div>
      </section>

      {/* Stats/Logo Cloud */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Progettato per combattere i problemi reali dei saloni</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100">
            <div><div className="text-3xl font-bold text-indigo-600 mb-1">40%</div><div className="text-xs font-medium text-slate-500">Prenotazioni in fascia serale/notturna garantite</div></div>
            <div><div className="text-3xl font-bold text-indigo-600 mb-1">0%</div><div className="text-xs font-medium text-slate-500">Commissioni nascoste o percentuali sui nuovi clienti</div></div>
            <div><div className="text-3xl font-bold text-indigo-600 mb-1">-95%</div><div className="text-xs font-medium text-slate-500">Riduzione dei client "No-show" non presentati</div></div>
            <div><div className="text-3xl font-bold text-indigo-600 mb-1">+19%</div><div className="text-xs font-medium text-slate-500">Aumento fatturato con l'automazione Win-back</div></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Non un semplice calendario.<br/>Un vero motore di crescita.</h2>
            <p className="text-lg text-slate-600">A differenza dei marketplace generalisti, abbiamo creato uno strumento verticale che gestisce le reali dinamiche della colorazione, dei tempi di posa e del recupero clienti in Italia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<ShieldCheck size={32} className="text-emerald-500" />}
              title="Gestione No-Show & Storico"
              desc="Previeni i buchi in agenda grazie a promemoria precisi, uno storico dettagliato sull'affidabilità di ogni cliente e protezione contro le perdite di tempo."
            />
            <FeatureCard 
              icon={<Smartphone size={32} className="text-indigo-500" />}
              title="Link WhatsApp Rapidi (Gratis)"
              desc="Nessun costo extra per SMS o API a pagamento. Genera con un click messaggi WhatsApp Web o Mobile precompilati per inviare promemoria, auguri e messaggi di win-back ai clienti."
            />
            <FeatureCard 
              icon={<SplitSquareHorizontal size={32} className="text-fuchsia-500" />}
              title="Smart Booking & Tempi Posa"
              desc="L'algoritmo spezza in automatico i servizi lunghi. Se fai un colore con posa 40 min, il sistema vende quello slot temporale per un taglio veloce di un altro cliente."
            />
            <FeatureCard 
              icon={<Target size={32} className="text-amber-500" />}
              title="Recupero Clienti Win-Back"
              desc="Il sistema analizza lo storico e capisce quando un cliente sta per abbandonarti. Manda un messaggio automatico con sconto mirato e riportalo in salone."
            />
            <FeatureCard 
              icon={<CalendarRange size={32} className="text-blue-500" />}
              title="Prenotazione Online 24/7"
              desc="Ricevi appuntamenti da Instagram, Facebook, e Reserve with Google mentre dormi. Il 40% delle tue potenziali clienti vuole prenotare di sera."
            />
            <FeatureCard 
              icon={<Clock size={32} className="text-rose-500" />}
              title="Risorse Multi-Postazione"
              desc="Associa servizi non solo all'operatore ma anche ai lavatesta o ai caschi vaporizzatori, evitando overbooking fisico delle tue poltrone."
            />
          </div>
        </div>
      </section>

      {/* Compare Section */}
      <section className="py-20 bg-white">
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Perché scegliere Root Salon Manager e non i giganti del web?</h2>
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-sm">
               <div className="space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="bg-red-100 text-red-600 p-2 rounded-lg mt-1 shrink-0"><XIcon /></div>
                     <div>
                        <h4 className="font-bold text-lg">Il Problema degli "Altri"</h4>
                        <p className="text-slate-600 text-sm">I portali generalisti ti portano clienti, ma si trattengono pesanti percentuali ogni volta, di fatto "affittandoti" i tuoi stessi clienti. In più costringono i tuoi clienti a scaricare app pesanti o si appoggiano a SMS extra a pagamento.</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mt-1 shrink-0"><CheckCircle2 /></div>
                     <div>
                        <h4 className="font-bold text-lg">La Soluzione Root Salon</h4>
                        <p className="text-slate-600 text-sm">Tu paghi solo un canone fisso e trasparente. Il tuo database clienti è TUA proprietà. Sfruttiamo WhatsApp (l'app che tutte già hanno) per la fidelizzazione e verticalizziamo le funzioni sui parrucchieri. E non dirottiamo le TUE clienti verso altri saloni se la tua agenda è piena.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Un prezzo fisso, per sempre.</h2>
            <p className="text-slate-400 text-lg">Scegli il piano più adatto al tuo salone. Zero commissioni sui clienti, zero sorprese.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Piano Mensile */}
            <div className="bg-slate-800 border border-slate-700 text-white rounded-3xl p-8 shadow-xl flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Piano Mensile</h3>
                <p className="text-slate-400 text-sm mt-2">La flessibilità di pagare mese per mese.</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-black">29€</span>
                <span className="text-slate-500"> / mese</span>
                <p className="text-sm text-slate-500 mt-1">+ IVA</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Smart Booking & Gestione Risorse</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Generatore Link WhatsApp Web</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Promemoria appuntamenti</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Magazzino & Statistiche</li>
              </ul>
              <button onClick={() => setIsDemoModalOpen(true)} className="block w-full text-center bg-slate-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-600 transition shadow-lg">
                Inizia Prova Gratuita
              </button>
            </div>

            {/* Piano Annuale */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                PIÙ SCELTO — 2 MESI IN REGALO
              </div>
              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-bold">Piano Annuale</h3>
                <p className="text-slate-500 text-sm mt-2">Massimo risparmio per far crescere il tuo salone.</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-black">290€</span>
                <span className="text-slate-500"> / anno</span>
                <p className="text-sm text-indigo-600 font-bold mt-1">Pari a soli 24,16€ al mese (+ IVA)</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-indigo-500" /> <span className="font-bold">Tutto ciò che c'è nel mensile</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Algoritmo Win-Back Clienti</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Profilazione Clienti Premium</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Accesso a future funzionalità in beta</li>
              </ul>
              <button onClick={() => setIsDemoModalOpen(true)} className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg">
                Provalo Gratis per 7 Giorni
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-indigo-600 py-20 px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Pronto a trasformare il tuo salone in un'azienda moderna?</h2>
        <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">Unisciti ai saloni italiani che hanno smesso di rincorrere le telefonate e hanno iniziato a governare i propri incassi con la tecnologia.</p>
        <button onClick={() => setIsDemoModalOpen(true)} className="inline-block bg-white text-indigo-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition shadow-xl">
          Sblocca la tua Demo di 7 giorni
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-4 text-center text-slate-400">
         <p className="font-bold text-white mb-2">Root Salon Manager &copy; 2026</p>
         <p className="text-sm">Sviluppato con passione in Italia per i professionisti dell'Acconciatura.</p>
      </footer>
      {isDemoModalOpen && <DemoModal onClose={() => setIsDemoModalOpen(false)} />}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
      <div className="mb-6 inline-block bg-slate-50 p-4 rounded-xl">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  )
}

function XIcon() {
   return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
   )
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ email: string; password: string; start: string } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const test_date = formData.get('test_date') as string;

    try {
      const response = await fetch('https://shjscgzptcnnosylujay.supabase.co/functions/v1/request-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, test_date })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la richiesta');
      }

      setSuccessData({ email: data.email, password: data.password, start: test_date });
    } catch (err: any) {
      setError(err.message || 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition">
          <X size={20} />
        </button>

        {successData ? (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Demo Pronta!</h3>
              <p className="text-slate-600 mb-6 focus:text-slate-900">Il tuo ambiente di test isolato è stato creato con successo e scadrà automaticamente dopo 7 giorni dal {new Date(successData.start).toLocaleDateString()}.</p>
              
              <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Credenziali (Salvale!)</p>
                <div className="space-y-3 font-mono text-sm">
                  <div><span className="text-slate-500">Email:</span> <br/><span className="font-bold text-slate-800 selection:bg-indigo-200">{successData.email}</span></div>
                  <div><span className="text-slate-500">Password:</span> <br/><span className="font-bold text-slate-800 selection:bg-indigo-200">{successData.password}</span></div>
                </div>
              </div>

              <a href="https://app.rootfix.app/login" className="block w-full text-center bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
                Vai al Gestionale
              </a>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Inizia la tua prova</h3>
            <p className="text-slate-600 mb-8 max-w-sm">Attiva il tuo gestionale per 7 giorni. Senza nessun impegno.</p>
            
            {error && <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Salone <span className="text-red-500">*</span></label>
                <input required name="name" type="text" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Es. Root Salon" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">La tua Email <span className="text-red-500">*</span></label>
                <input required name="email" type="email" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quando inizierai il test? <span className="text-red-500">*</span></label>
                <input required name="test_date" type="datetime-local" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                <p className="text-xs text-slate-500 mt-1">Avrai 7 giorni di tempo a partire da questa data.</p>
              </div>

              <button disabled={loading} type="submit" className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Genera Ambiente Demo'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
