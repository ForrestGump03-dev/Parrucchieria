import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Target, SplitSquareHorizontal, CalendarRange, Clock } from 'lucide-react';

function App() {
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
              <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-indigo-700 transition shadow-sm">
                Prova Gratis
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
            L'alternativa Made in Italy a Treatwell e Fresha
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Il gestionale per parrucchieri che <span className="text-indigo-600">azzera i No-Show</span> e riempie l'agenda.
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
            Nessuna commissione occulta. Protezione totale degli incassi, automazioni WhatsApp per il recupero clienti e Smart Booking progettato esclusivamente per le esigenze dei Saloni di Acconciatura.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold text-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2">
              Inizia la Prova Gratuita <ArrowRight size={20} />
            </button>
            <button className="bg-white text-slate-700 border border-slate-300 px-8 py-3.5 rounded-full font-bold text-lg hover:bg-slate-50 transition flex items-center justify-center">
              Scopri le Funzionalità
            </button>
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
              title="Protezione Incassi & No-Show"
              desc="Basta rimetterci soldi per clienti che non si presentano. Chiedi carte a garanzia o pagamenti anticipati, azzerando istantaneamente il rischio dei buchi in agenda."
            />
            <FeatureCard 
              icon={<Smartphone size={32} className="text-indigo-500" />}
              title="Automazioni WhatsApp API"
              desc="Le mail non le legge nessuno. Integra nativamente WhatsApp per promemoria a 24/48h, auguri di compleanno e recupero automatico dei clienti inattivi."
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
                        <p className="text-slate-600 text-sm">Treatwell, Fresha e Booksy ti portano clienti, ma si trattengono pesanti percentuali ogni volta, di fatto "affittandoti" i tuoi stessi clienti. Usano SMS che ti fanno pagare a peso d'oro o le loro App che le clienti odiano scaricare.</p>
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
            <p className="text-slate-400 text-lg">Zero commissioni sui nuovi clienti. Zero sorprese a fine mese.</p>
          </div>

          <div className="max-w-lg mx-auto bg-white text-slate-900 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Piano Pro</h3>
              <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">Più scelto</span>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-black">49</span>
              <span className="text-slate-500">/mese</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Smart Booking & Gestione Risorse</li>
              <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Integrazione WhatsApp API (Winback, Compleanni)</li>
              <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Prenotazione Online & Reserve with Google</li>
              <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Protezione No-Show (Pagamenti integrati)</li>
              <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500" /> Magazzino & Statistiche Avanzate</li>
            </ul>
            <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg">
              Inizia la Prova di 14 Giorni
            </button>
            <p className="text-center text-slate-500 text-sm mt-4">Nessuna carta di credito richiesta per provare.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-indigo-600 py-20 px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Pronto a trasformare il tuo salone in un'azienda moderna?</h2>
        <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">Unisciti ai saloni italiani che hanno smesso di rincorrere le telefonate e hanno iniziato a governare i propri incassi con la tecnologia.</p>
        <button className="bg-white text-indigo-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition shadow-xl">
          Sblocca la tua Prova Gratuita
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-4 text-center text-slate-400">
         <p className="font-bold text-white mb-2">Root Salon Manager &copy; 2026</p>
         <p className="text-sm">Sviluppato con passione in Italia per i professionisti dell'Acconciatura.</p>
      </footer>
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

export default App;
