import { useState, useRef } from 'react';
import { Copy, Sparkles, MessageCircle, Instagram, Check, ExternalLink, Printer, QrCode, X, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  title: string;
  description: string;
  category: 'promo' | 'social' | 'whatsapp';
  content: string;
}

const TEMPLATES: Template[] = [
  {
    id: 't1',
    title: 'Promozione Trattamento',
    description: 'Post per Instagram per lanciare un nuovo trattamento o uno sconto',
    category: 'social',
    content: `✨ Ritrova la bellezza dei tuoi capelli! ✨\n\nSolo per questa settimana, offriamo il nostro esclusivo trattamento [NOME TRATTAMENTO] a un prezzo speciale di [PREZZO/SCONTO]! 🎁\n\nLasciati coccolare dal nostro team e dona nuova vita alla tua chioma. I posti sono limitati, prenota subito il tuo momento di relax!\n\n👇 Clicca sul link in bio o scrivici in DM per riservare il tuo posto.\n\n📍 Ci trovi in [INDIRIZZO]\n📲 Info e prenotazioni: [TELEFONO]\n\n#parrucchiere #[CITTA] #haircare #bellezza #promozione #capellisani #hairstylist`
  },
  {
    id: 't2',
    title: 'Recupero Appuntamento Annullato',
    description: 'Messaggio WhatsApp o Storia IG per riempire un buco improvviso',
    category: 'whatsapp',
    content: `🚨 DISPONIBILITÀ LAST MINUTE! 🚨\n\nSi è appena liberato un posto oggi alle ore [ORARIO] per [TAGLIO/COLORE/PIEGA]! 💇‍♀️\n\nChi prima prenota, si aggiudica il posto! Rispondi subito a questo messaggio per confermare. Ti aspettiamo in salone! ✨`
  },
  {
    id: 't3',
    title: 'Auguri Speciali (Natale/Feste)',
    description: 'Messaggio per le festività con ringraziamento',
    category: 'social',
    content: `🌟 Tanti auguri dal team di [NOME SALONE]! 🌟\n\nVolevamo prenderci un momento per ringraziare tutte le nostre meravigliose clienti per la fiducia che ci avete dimostrato quest'anno. Prenderci cura della vostra bellezza è la nostra passione più grande! ❤️\n\nVi auguriamo feste piene di gioia, relax e... capelli stupendi! Ci rivediamo il [DATA RIAPERTURA] più cariche che mai.\n\nBuone Feste! 🥂🎄`
  },
  {
    id: 't4',
    title: 'Presentazione Nuovo Prodotto',
    description: 'Ideale per spingere la rivendita di prodotti in salone',
    category: 'social',
    content: `🛍️ NOVITÀ IN SALONE! 🛍️\n\nÈ finalmente arrivato il nuovo [NOME PRODOTTO] della linea [MARCA]! Se i tuoi capelli hanno bisogno di [BENEFICIO, es. idratazione profonda/volume extra], questo è il prodotto definitivo.\n\n✨ Perché lo amiamo?\n- [MOTIVO 1]\n- [MOTIVO 2]\n\nPassa in salone a provarlo o scrivici per metterlo da parte per te! I tuoi capelli ti ringrazieranno 😉`
  },
  {
    id: 't5',
    title: 'Messaggio di Benvenuto',
    description: 'Template WhatsApp da inviare a un nuovo cliente',
    category: 'whatsapp',
    content: `Ciao [NOME], benvenuta nel nostro salone! 🎉\n\nÈ stato un vero piacere conoscerti oggi. Speriamo che il risultato finale ti piaccia tanto quanto è piaciuto a noi realizzarlo!\n\nSe ti fa piacere, condividi una foto taggandoci su Instagram [@TUOPROFILO], non vediamo l'ora di vederla! Per il tuo prossimo appuntamento, puoi scriverci direttamente qui.\n\nA presto e buona giornata! 💖`
  }
];

export default function Marketing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'whatsapp'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  // URL pubblico
  const publicQrUrl = user ? `${window.location.origin}/qr/${user.id}` : '';

  const handlePrintQr = () => {
     if (!qrRef.current) return;
     const printContents = qrRef.current.innerHTML;
     const originalContents = document.body.innerHTML;
     
     document.body.innerHTML = printContents;
     window.print();
     document.body.innerHTML = originalContents;
     window.location.reload(); 
  };

  const filteredTemplates = TEMPLATES.filter(t => activeTab === 'all' || t.category === activeTab);


  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Testo copiato negli appunti!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Errore durante la copia');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorazioni di background */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute bottom-0 left-10 -mb-8 w-32 h-32 rounded-full bg-indigo-400 opacity-20 blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold flex items-center gap-3">
                 <Sparkles className="text-amber-300" size={28} />
                 Marketing Assistant
              </h1>
              <p className="mt-2 text-indigo-100 max-w-xl text-sm leading-relaxed">
                 Modelli pronti all'uso per i tuoi social e messaggi WhatsApp. 
                 Copia, incolla, personalizza e risparmia tempo nella tua comunicazione.
                 I campi tra parentesi quadre <span className="font-semibold text-white">[COME QUESTI]</span> sono da personalizzare.
              </p>
            </div>
            
            <a 
               href="https://gemini.google.com" 
               target="_blank" 
               rel="noopener noreferrer"
               className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 group whitespace-nowrap"
            >
               Apri Google Gemini 
               <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
        </div>
      </div>



      {/* SEZIONE: QR Code Clienti */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
         
         <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
               <QrCode size={40} />
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-slate-800 text-xl">QR Code Iscrizione Clienti</h3>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-md">NUOVO</span>
               </div>
               <p className="text-slate-500 text-sm max-w-2xl mb-5">
                  Stampa questo QR Code e posizionalo in cassa o sugli specchi. 
                  I clienti potranno iscriversi da soli alla tua "Lista VIP" usando il loro smartphone, popolando automaticamente il tuo database con Nome, Numero e Data di Nascita!
               </p>
               
               <div className="flex gap-3 flex-wrap">
                  <button 
                     onClick={() => setIsQrModalOpen(true)}
                     className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                     <Printer size={18} /> Mostra & Stampa QR
                  </button>
                  <button 
                     onClick={() => {
                        navigator.clipboard.writeText(publicQrUrl);
                        toast.success('Link copiato! Puoi inviarlo su WhatsApp o Instagram.');
                     }}
                     className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                     <Copy size={18} /> Copia Link Diretto
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* Modal QR Code */}
      {isQrModalOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
               <button 
                  onClick={() => setIsQrModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-10"
               >
                  <X size={20} />
               </button>
               
               <div className="p-8 text-center print:p-0" ref={qrRef}>
                  <div className="print:flex print:flex-col print:items-center print:justify-center print:h-screen print:w-full">
                     <h2 className="text-3xl font-bold text-slate-800 mb-2">Entra nella Lista VIP!</h2>
                     <p className="text-slate-500 font-medium mb-8 max-w-xs mx-auto">
                        Inquadra il codice QR con la fotocamera del tuo smartphone per iscriverti e ricevere promozioni esclusive.
                     </p>
                     
                     <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 inline-block mb-8 relative">
                        {/* Decorazioni angolari per il QR */}
                        <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl print:border-black"></div>
                        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl print:border-black"></div>
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl print:border-black"></div>
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl print:border-black"></div>
                        
                        <div className="p-4 bg-white rounded-xl">
                           <QRCode value={publicQrUrl} size={220} level="H" />
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-3 px-6 rounded-full mx-auto w-max print:hidden">
                        <Smartphone size={20} />
                        <span>Veloce e Gratuito</span>
                     </div>
                  </div>
               </div>

               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
                  <button 
                     onClick={() => setIsQrModalOpen(false)}
                     className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                     Chiudi
                  </button>
                  <button 
                     onClick={handlePrintQr}
                     className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                  >
                     <Printer size={18} /> Stampa (PDF)
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Filtri */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-xl gap-1 w-full max-w-sm">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Tutti
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'social' ? 'bg-white shadow-sm text-fuchsia-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Instagram size={16} /> Social
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'whatsapp' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MessageCircle size={16} /> WhatsApp
        </button>
      </div>

      {/* Griglia Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
           <div key={template.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className={`px-5 py-4 border-b flex justify-between items-center ${template.category === 'social' ? 'bg-fuchsia-50 border-fuchsia-100' : 'bg-emerald-50 border-emerald-100'}`}>
                 <div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 block ${template.category === 'social' ? 'text-fuchsia-600' : 'text-emerald-600'}`}>
                       {template.category === 'social' ? 'Instagram/Facebook' : 'Messaggio WhatsApp'}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base">{template.title}</h3>
                 </div>
                 {template.category === 'social' ? <Instagram className="text-fuchsia-300" size={24} /> : <MessageCircle className="text-emerald-300" size={24} />}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                 <p className="text-xs text-slate-500 mb-4">{template.description}</p>
                 
                 <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap flex-1 border border-slate-100 font-mono leading-relaxed">
                    {template.content}
                 </div>
                 
                 <button
                    onClick={() => handleCopy(template.id, template.content)}
                    className={`mt-4 w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${copiedId === template.id ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                 >
                    {copiedId === template.id ? (
                      <>
                        <Check size={18} /> Copiato!
                      </>
                    ) : (
                      <>
                        <Copy size={18} /> Copia Testo
                      </>
                    )}
                 </button>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
}
