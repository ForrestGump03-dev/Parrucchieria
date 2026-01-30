import { useEffect, useState } from 'react';
import { useStats, type DateRange } from '../hooks/useStats';
import { TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard, Award, UserCheck, Filter, ArrowRight, Database, Download, CloudAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parse, startOfDay, endOfDay, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { exportToCsv } from '../lib/utils';

export default function Reports() {
  const { stats, loading, fetchStats } = useStats();
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    label: 'Questo Mese'
  });

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDates, setCustomDates] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchStats(selectedRange);
  }, [fetchStats, selectedRange]);

  const handleRangeChange = (rangeType: string) => {
    const today = new Date();
    let newRange: DateRange;

    if (rangeType === 'custom') {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);

    switch (rangeType) {
      case 'today':
        newRange = { start: startOfDay(today), end: endOfDay(today), label: 'Oggi' };
        break;
      case 'week':
        newRange = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }), label: 'Questa Settimana' };
        break;
      case 'month':
        newRange = { start: startOfMonth(today), end: endOfMonth(today), label: 'Questo Mese' };
        break;
      case 'lastMonth': {
         const lastMonth = subMonths(today, 1);
         newRange = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: 'Mese Scorso' };
         break;
      }
      case 'year':
        newRange = { start: startOfYear(today), end: endOfYear(today), label: "Quest'Anno" };
        break;
      default:
        return;
    }
    setSelectedRange(newRange);
  };

  const applyCustomRange = () => {
    if (!customDates.start || !customDates.end) {
      toast.error("Seleziona entrambe le date.");
      return;
    }

    const start = startOfDay(parse(customDates.start, 'yyyy-MM-dd', new Date()));
    const end = endOfDay(parse(customDates.end, 'yyyy-MM-dd', new Date()));

    if (!isValid(start) || !isValid(end)) {
      toast.error("Date non valide.");
      return;
    }

    if (start > end) {
      toast.error("La data di inizio deve essere precedente alla data di fine.");
      return;
    }

    setSelectedRange({
      start,
      end,
      label: 'Personalizzato'
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Analisi Finanziaria</h1>
             <p className="text-slate-500 text-sm">Panoramica completa dell'andamento del salone</p>
          </div>
          
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm overflow-x-auto">
             {[
               { id: 'today', label: 'Oggi' },
               { id: 'week', label: 'Settimana' },
               { id: 'month', label: 'Mese' },
               { id: 'lastMonth', label: 'Mese Scorso' },
               { id: 'year', label: 'Anno' },
               { id: 'custom', label: 'Personalizzato' }
             ].map((period) => (
               <button
                 key={period.id}
                 onClick={() => handleRangeChange(period.id)}
                 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                   selectedRange?.label === (period.id === 'lastMonth' ? 'Mese Scorso' : 
                                             period.id === 'year' ? "Quest'Anno" : 
                                             period.id === 'today' ? 'Oggi' : 
                                             period.id === 'week' ? 'Questa Settimana' : 
                                             period.id === 'custom' ? 'Personalizzato' : 'Questo Mese')
                     ? 'bg-indigo-100 text-indigo-700' 
                     : 'text-slate-600 hover:bg-slate-50'
                 }`}
               >
                 {period.label}
               </button>
             ))}
          </div>
        </div>

        {showCustomPicker && (
          <div className="md:self-end bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Dal:</span>
              <input 
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <ArrowRight size={16} className="text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Al:</span>
              <input 
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button 
              onClick={applyCustomRange}
              className="ml-2 bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Applica
            </button>
          </div>
        )}
      </div>

      {/* FIXED CARDS - Always visible global stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Incasso Oggi</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">€ {stats?.todayRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
               <DollarSign size={20} />
            </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mese Corrente</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">€ {stats?.monthRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
               <Calendar size={20} />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anno Corrente</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">€ {stats?.yearRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
               <CreditCard size={20} />
            </div>
        </div>
      </div>

      {/* DYNAMIC ANALYSIS SECTION */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
         <div className="flex justify-between items-start mb-6">
            <div>
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <Filter className="text-indigo-400" size={24} />
                 Analisi: {selectedRange.label}
               </h2>
               <p className="text-slate-400 text-sm mt-1">
                 Dal {format(selectedRange.start, 'dd MMM', { locale: it })} al {format(selectedRange.end, 'dd MMM yyyy', { locale: it })}
               </p>
            </div>
            
            <div className="text-right">
               <div className="text-3xl font-bold">€ {stats?.periodRevenue.toFixed(2)}</div>
               {stats && (
                 <div className={`flex items-center justify-end gap-1 text-sm font-medium ${stats.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                   {stats.growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                   {Math.abs(stats.growth) > 999 
                      ? '> 999%' 
                      : `${Math.abs(stats.growth).toFixed(1)}%`
                   } vs periodo prec.
                 </div>
               )}
            </div>
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Treatments */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
               <h3 className="text-indigo-300 font-semibold mb-4 flex items-center gap-2">
                 <Award size={18} />
                 Servizi più richiesti
                 <span className="text-xs font-normal text-slate-500 ml-auto">({stats?.totalVisits} visite uniche)</span>
               </h3>
               
               <div className="space-y-4">
                  {stats?.topTreatments.slice(0, 5).map((t, i) => (
                    <div key={t.name} className="relative">
                       <div className="flex justify-between items-end mb-1 text-sm">
                          <span className="font-medium text-slate-200">{i+1}. {t.name}</span>
                          <span className="text-slate-300">{t.count} esecuzioni</span>
                       </div>
                       
                       {/* Progress Bar Container */}
                       <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                          <div 
                             className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                             style={{ width: `${Math.min(t.penetration, 100)}%` }}
                          ></div>
                       </div>
                       
                       <div className="flex justify-between text-xs">
                          <span className="text-emerald-400 font-medium">{t.penetration.toFixed(1)}% delle visite</span>
                          <span className="text-slate-500">Tot € {t.totalRevenue.toFixed(0)}</span>
                       </div>
                    </div>
                  ))}
                  {(!stats?.topTreatments || stats.topTreatments.length === 0) && (
                     <div className="text-center text-slate-500 py-4">Nessun dato nel periodo</div>
                  )}
               </div>
            </div>

            {/* Top Clients */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
               <h3 className="text-emerald-400 font-semibold mb-4 flex items-center gap-2">
                 <UserCheck size={18} />
                 Clienti Top (per frequenza)
               </h3>
               
               <div className="space-y-3">
                  {stats?.topClients.slice(0, 5).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                             ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-600 text-slate-300'}
                          `}>
                             {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                             <div className="text-sm font-medium text-slate-200">{c.name}</div>
                             <div className="text-xs text-slate-500">Cliente</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-bold text-white">{c.visits} Visite</div>
                          <div className="text-xs text-slate-400">€ {c.spent.toFixed(2)}</div>
                       </div>
                    </div>
                  ))}
                  {(!stats?.topClients || stats.topClients.length === 0) && (
                     <div className="text-center text-slate-500 py-4">Nessun dato nel periodo</div>
                  )}
               </div>
            </div>
         </div>
      </div>
      
      {/* EXPORT SECTION */}
      <BackupSection />
    </div>
  );
}

function BackupSection() {
    const [loading, setLoading] = useState(false);

    const handleBackup = async () => {
        if (!confirm("Vuoi scaricare una copia di sicurezza di tutti i dati (Clienti, Appuntamenti, Storico)?")) return;
        
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");

            // 1. Export Clients
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id);
            
            if (clientError) throw clientError;

            // 2. Export Appointments
            const { data: appointments, error: apptError } = await supabase
                .from('appointments')
                .select('*, clients(first_name, last_name)')
                .eq('user_id', user.id) // Ensure RLS policy compliance
                .order('date', { ascending: false });

            if (apptError) throw apptError;

            // 3. Generate CSVs
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            let exportedCount = 0;
            
            if (clients && clients.length > 0) {
                 if(exportToCsv(`backup_clienti_${dateStr}.csv`, clients)) exportedCount++;
            }
            
            if (appointments && appointments.length > 0) {
                 // Flatten structure for CSV
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const flatAppts = appointments.map((a: any) => ({
                     id: a.id,
                     client_id: a.client_id, // Critical for restoration
                     date: a.date,
                     start_time: a.start_time,
                     client_name: a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : 'Eliminato',
                     treatment: a.treatment,
                     price: a.price,
                     notes: a.notes,
                     created_at: a.created_at,
                     user_id: a.user_id
                 }));
                 if(exportToCsv(`backup_storico_${dateStr}.csv`, flatAppts)) exportedCount++;
            }

            if (exportedCount > 0) {
                 toast.success(`Backup completato! Scaricati ${exportedCount} file.`);
                 // Save last backup date
                 localStorage.setItem('lastBackup', Date.now().toString());
            } else {
                 toast("Nessun dato trovato da esportare.", { icon: 'ℹ️' });
            }

        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
            toast.error("Errore durante il backup: " + msg);
        } finally {
            setLoading(false);
            // Fix: Restore window focus after download dialogs close to prevent "frozen" inputs
            setTimeout(() => {
                 window.focus();
                 document.body.focus();
            }, 1000);
        }
    };

    return (
        <div className="mt-12 border-t-2 border-slate-100 pt-8 pb-12">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm mt-1">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Centro di Sicurezza Dati</h3>
                        <p className="text-slate-600 text-sm max-w-xl mt-1">
                            Poichè questa versione utilizza il cloud base, è consigliabile scaricare periodicamente una copia dei propri dati sul computer. Puoi aprire questi file con Excel.
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-indigo-700 bg-indigo-100/50 w-fit px-2 py-1 rounded">
                             <CloudAlert size={14} />
                             Il sistema ti ricorderà di fare un backup ogni 15 giorni.
                        </div>
                    </div>
                </div>
                
                <button 
                  onClick={handleBackup}
                  disabled={loading}
                  className="whitespace-nowrap flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-70"
                >
                    {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Download size={20} />}
                    Scarica Backup Completo
                </button>
            </div>
        </div>
    );
}
