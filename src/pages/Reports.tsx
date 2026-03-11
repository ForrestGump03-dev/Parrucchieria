import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStats, type DateRange } from '../hooks/useStats';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Award, UserCheck, UserMinus, Filter, ArrowRight, Database, Download, Users, BarChart as BarChartIcon } from 'lucide-react';
import ClientDetailView from '../components/ClientDetailView';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parse, startOfDay, endOfDay, isValid } from 'date-fns';
import { supabase } from '../lib/supabase';
import { createCsvString } from '../lib/utils';
import { generateExcelReport } from '../utils/generateExcelReport';
import JSZip from 'jszip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Reports() {
  const { user } = useAuth();
  const { stats, loading, fetchStats } = useStats();

  const seedPenetrationTest = async () => {
    if (!user) return toast.error("Devi essere loggato");
    if (!confirm("⚠️ Attenzione: Questo genererà 100 clienti e appuntamenti di test per OGGI. Vuoi procedere?")) return;
    
    const toastId = toast.loading("Generazione dati test...");
    try {
      // 1. Genera dati clienti
      const prefix = "TestRep";
      const targetPhones: string[] = [];
      const clientsBatch = Array.from({ length: 100 }).map((_, i) => {
        const phone = `555${String(i).padStart(7, '0')}`;
        targetPhones.push(phone);
        return {
          first_name: prefix,
          last_name: `User${i}`,
          phone: phone,
          user_id: user.id
        };
      });

      // 2. Trova clienti esistenti (evita upsert con onConflict che richiede constraint unique)
      const { data: existingClients, error: fetchError } = await supabase
        .from('clients')
        .select('id, phone')
        .in('phone', targetPhones);
        
      if (fetchError) throw fetchError;

      const existingPhoneSet = new Set(existingClients?.map(c => c.phone));
      const newClients = clientsBatch.filter(c => !existingPhoneSet.has(c.phone));
      
      let finalClients: { id: string; }[] = existingClients || [];

      // 3. Inserisci nuovi clienti se necessario
      if (newClients.length > 0) {
        const { data: insertedClients, error: insertError } = await supabase
          .from('clients')
          .insert(newClients)
          .select('id, phone');

        if (insertError) throw insertError;
        if (insertedClients) {
          finalClients = [...finalClients, ...insertedClients];
        }
      }

      if (finalClients.length === 0) throw new Error("Impossibile recuperare clienti di test");

      const today = new Date().toISOString().split('T')[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appointments: any[] = [];

      // Use real treatments found in the constants/app
      const T_100 = "Taglio"; // 100%
      const T_50 = "Special Shampoo (L'Oreal S.E.)"; // ~50%
      const T_20 = "Tonalizzante"; // ~20%

      finalClients.forEach(client => {
         // A: Common Treatment (100%) -> Tutti i clienti fanno questo
         appointments.push({
           client_id: client.id,
           date: today,
           treatment: T_100,
           price: 25,
           user_id: user.id
         });

         // B: ~50% Treatment -> Metà dei clienti fa anche questo
         if (Math.random() < 0.5) {
            appointments.push({
               client_id: client.id,
               date: today,
               treatment: T_50,
               price: 15,
               user_id: user.id
            });
         }
         
         // C: ~20% Treatment -> Pochi clienti fanno questo
         if (Math.random() < 0.2) {
             appointments.push({
               client_id: client.id,
               date: today,
               treatment: T_20,
               price: 45,
               user_id: user.id
            });
         }
      });

      const { error: aptError } = await supabase.from('appointments').insert(appointments);
      if (aptError) throw aptError;

      toast.success("Dati test inseriti!", { id: toastId });
      fetchStats(selectedRange); 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast.error(`Errore seed: ${error.message || 'Unknown'}`, { id: toastId });
    }
  };

  const [selectedRange, setSelectedRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    label: 'Questo Mese'
  });

  const [clientViewMode, setClientViewMode] = useState<'faith' | 'sleep'>('faith');
  const [showDetailView, setShowDetailView] = useState(false);
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

  if (showDetailView) {
    return <ClientDetailView range={selectedRange} onClose={() => setShowDetailView(false)} />;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Analisi Finanziaria</h1>
               <p className="text-slate-500 text-sm">Monitora le performance del tuo salone</p>
               {import.meta.env.DEV && (
                  <button 
                    onClick={seedPenetrationTest}
                    className="mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200 hover:bg-amber-200"
                  >
                    🛠️ Seed Test (100 Clienti)
                  </button>
               )}
            </div>
            <button
              onClick={() => setShowDetailView(true)}
              className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm mt-0.5"
            >
              <Database size={15} />
              Registro Dettagliato
              <ArrowRight size={14} className="text-indigo-400" />
            </button>
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

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Incasso Totale Periodo</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">€ {stats?.periodRevenue.toFixed(2)}</h3>
               {stats && (
                 <div className="mt-1 space-y-0.5">
                   <div className={`flex items-center gap-1 text-xs font-medium ${stats.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                     {stats.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     <span>{Math.abs(stats.growth) > 999 ? '> 999%' : `${Math.abs(stats.growth).toFixed(1)}%`} vs prec.</span>
                   </div>
                   <div className="text-[10px] text-slate-400">
                      di cui € {stats.productRevenue.toFixed(2)} da prodotti
                   </div>
                 </div>
               )}
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
               <DollarSign size={20} />
            </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visite Totali</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalVisits}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
               <Users size={20} />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scontrino Medio</p>
               <h3 className="text-2xl font-bold text-slate-800 mt-1">€ {stats?.averageTicket.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
               <CreditCard size={20} />
            </div>
        </div>

        
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart: Daily Trend */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BarChartIcon className="text-indigo-500" size={20} />
                  Andamento Giornaliero
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.dailyTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748B'}} 
                            tickMargin={10}
                            minTickGap={30}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748B'}} 
                            tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => [`€ ${Number(value).toFixed(2)}`, 'Incasso']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#6366f1" 
                            strokeWidth={3} 
                            dot={{ fill: '#6366f1', strokeWidth: 2 }} 
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Staff Ranking */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Award className="text-amber-500" size={20} />
                  Top Staff
              </h3>
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stats?.staffStats?.slice(0,5) || []} margin={{ left: 0, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                           dataKey="name" 
                           type="category" 
                           axisLine={false} 
                           tickLine={false}
                           width={80}
                           tick={{fontSize: 12, fill: '#64748B'}} 
                        />
                        <Tooltip 
                            cursor={{fill: '#F1F5F9'}} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => [`€ ${Number(value).toFixed(2)}`, 'Generato']}
                        />
                        <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={20}>
                            {stats?.staffStats?.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Treatments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <Filter className="text-indigo-500" size={20} />
                 Trattamenti Top
               </h3>
               
               <div className="space-y-4">
                  {stats?.topTreatments.slice(0, 5).map((t, i) => (
                    <div key={t.name} className="relative">
                       <div className="flex justify-between items-end mb-1 text-sm">
                          <span className="font-medium text-slate-700">{i+1}. {t.name}</span>
                          <span className="text-slate-500">{t.count} esecuzioni</span>
                       </div>
                       
                       <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                          <div 
                             className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                             style={{ width: `${Math.min(t.penetration, 100)}%` }}
                          ></div>
                       </div>
                       
                       <div className="flex justify-between text-xs">
                          <span className="text-indigo-600 font-medium">{t.penetration.toFixed(1)}% delle visite</span>
                          <span className="text-slate-500 font-medium">Tot € {t.totalRevenue.toFixed(0)}</span>
                       </div>
                    </div>
                  ))}
                  {(!stats?.topTreatments || stats.topTreatments.length === 0) && (
                     <div className="text-center text-slate-400 py-8">Nessun dato nel periodo</div>
                  )}
               </div>
            </div>
            {/* Top Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                   <CreditCard size={20} />
                 </div>
                 Top Prodotti
               </h3>
               <div className="space-y-4">
                  {stats?.topProducts?.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b last:border-0 border-slate-100 pb-3 last:pb-0">
                       <div className="flex items-center gap-3">
                          <span className={`
                             text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                             ${i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}
                          `}>{i + 1}</span>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.quantity} venduti</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="font-bold text-slate-800 text-sm">€ {p.revenue.toFixed(2)}</div>
                          <div className="text-xs text-slate-400">Ricavo Tot.</div>
                       </div>
                    </div>
                  ))}
                  {(!stats?.topProducts || stats.topProducts.length === 0) && (
                     <div className="text-center text-slate-400 py-8 italic text-sm">Nessun prodotto venduto nel periodo</div>
                  )}
               </div>
            </div>
            {/* Top Clients Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {clientViewMode === 'faith' ? (
                       <><UserCheck className="text-emerald-500" size={20} /> Clienti Fedeli</>
                    ) : (
                       <><UserMinus className="text-amber-500" size={20} /> Clienti Dormienti</>
                    )}
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setClientViewMode('faith')}
                        className={`p-1 rounded ${clientViewMode === 'faith' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Clienti Fedeli"
                      >
                         <UserCheck size={16} />
                      </button>
                      <button 
                        onClick={() => setClientViewMode('sleep')}
                        className={`p-1 rounded ${clientViewMode === 'sleep' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Clienti Dormienti"
                      >
                         <UserMinus size={16} />
                      </button>
                  </div>
               </div>
               
               <div className="space-y-3">
                  {(clientViewMode === 'faith' ? stats?.topClients : stats?.sleepingClients)?.slice(0, 5).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
                             ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-500 border border-slate-200'}
                          `}>
                             {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                             <div className="text-sm font-bold text-slate-700">{c.name}</div>
                             <div className="text-xs text-slate-500">
                                {clientViewMode === 'sleep' ? 'Assente dal:' : 'Cliente'}
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-bold text-slate-800">
                             {clientViewMode === 'sleep' 
                                ? `${c.visits} in totale` 
                                : `${c.visits} Visite`
                             }
                          </div>
                          <div className="text-xs text-slate-500">
                             {clientViewMode === 'sleep' 
                                ? format(new Date(c.lastVisit), 'dd/MM/yyyy')
                                : `€ ${c.spent.toFixed(2)}`
                             }
                          </div>
                       </div>
                    </div>
                  ))}
                  {((clientViewMode === 'faith' ? (!stats?.topClients || stats.topClients.length === 0) : (!stats?.sleepingClients || stats.sleepingClients.length === 0))) && (
                     <div className="text-center text-slate-400 py-8">Nessun dato disponibile</div>
                  )}
               </div>
            </div>
      </div>
      
      {/* EXPORT SECTION */}
      <BackupSection range={selectedRange} />
    </div>
  );
}

interface BackupSectionProps {
  range: DateRange;
}

function BackupSection({ range }: BackupSectionProps) {
    const [loadingReport, setLoadingReport] = useState(false);
    const [loadingZip, setLoadingZip] = useState(false);

    const performReportDownload = async () => {
        setLoadingReport(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");
            
            // --- USER REPORT (Clean Data for selected range) ---
            const { data: reportData, error: reportError } = await supabase
                .from('appointments')
                .select('date, start_time, treatment, price, notes, clients(first_name, last_name), staff_members(name)')
                .gte('date', range.start.toISOString())
                .lte('date', range.end.toISOString())
                .not('price', 'is', null) // Only paid
                .order('date', { ascending: false });
            
            if (reportError) throw reportError;

            if (reportData && reportData.length > 0) {
                await generateExcelReport(reportData, range.label, range.start, range.end);
                toast.success('Report Excel creato con successo!');
            } else {
                 toast("Nessun dato trovato per questo periodo.", { icon: 'ℹ️' });
            }
        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
            toast.error("Errore durante l'esportazione: " + msg);
        } finally {
            setLoadingReport(false);
        }
    };

    const performBackup = async () => {
        setLoadingZip(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");
            
            const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
            const zip = new JSZip();

            // --- TECHNICAL BACKUP (Full Dump) ---
            
            // Clients
            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id);
            
            if (clientError) throw clientError;

            // Full History
            const { data: appointments, error: apptError } = await supabase
                .from('appointments')
                .select('*, clients(first_name, last_name)')
                .eq('user_id', user.id) 
                .order('date', { ascending: false });

            if (apptError) throw apptError;
            
            let hasFiles = false;

            if (clients && clients.length > 0) {
                 const csvStr = createCsvString(clients);
                 if (csvStr) {
                     zip.file(`BACKUP_Clienti_${dateStr}.csv`, csvStr);
                     hasFiles = true;
                 }
            }
            
            if (appointments && appointments.length > 0) {
                 // Flatten structure for CSV
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const flatAppts = appointments.map((a: any) => ({
                     id: a.id,
                     client_id: a.client_id, 
                     date: a.date,
                     start_time: a.start_time,
                     client_name: a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : 'Eliminato',
                     treatment: a.treatment,
                     price: a.price,
                     notes: a.notes,
                     created_at: a.created_at,
                     user_id: a.user_id
                 }));
                 const csvStr = createCsvString(flatAppts);
                 if (csvStr) {
                     zip.file(`BACKUP_Storico_${dateStr}.csv`, csvStr);
                     hasFiles = true;
                 }
            }

            if (hasFiles) {
                 const content = await zip.generateAsync({ type: 'blob' });
                 const url = URL.createObjectURL(content);
                 const link = document.createElement('a');
                 link.href = url;
                 link.download = `Backup_Salone_${dateStr}.zip`;
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 toast.success(`Backup di sicurezza salvato!`);
                 localStorage.setItem('lastBackup', Date.now().toString());
            } else {
                 toast("Nessun dato trovato da esportare.", { icon: 'ℹ️' });
            }

        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
            toast.error("Errore durante il backup: " + msg);
        } finally {
            setLoadingZip(false);
        }
    };

    return (
        <div className="mt-12 border-t-2 border-slate-100 pt-8 pb-12">
            {/* Status Indicatore Cloud */}
            <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-max">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Stato Database: Sincronizzato in Cloud e Protetto
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pannello 1: Export Commercialista */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col justify-between items-start gap-4">
                    <div>
                        <div className="p-3 bg-white rounded-lg text-indigo-600 shadow-sm w-max mb-3">
                            <BarChartIcon size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Report Fiscale & Storico</h3>
                        <p className="text-slate-600 text-sm mt-1">
                            Scarica un foglio Excel (XLSX) dettagliato delle vendite nel periodo selezionato ({range.label}). Impaginato e pronto da stampare o inviare al commercialista.
                        </p>
                    </div>
                    <button 
                      onClick={performReportDownload}
                      disabled={loadingReport}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-70"
                    >
                        {loadingReport ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Download size={18} />}
                        Esporta Report
                    </button>
                </div>

                {/* Pannello 2: Backup di Sicurezza Tecnico */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between items-start gap-4 shadow-sm">
                    <div>
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200 shadow-sm w-max mb-3">
                            <Database size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Backup di Sicurezza (ZIP)</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Scarica un archivio completo contenente tutti i clienti e lo storico. Da usare in caso di problemi tecnici.
                        </p>
                    </div>
                    <button 
                      onClick={performBackup}
                      disabled={loadingZip}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-sm transition-all disabled:opacity-70"
                    >
                        {loadingZip ? <div className="animate-spin w-4 h-4 border-2 border-slate-600/30 border-t-slate-600 rounded-full" /> : <Database size={18} />}
                        Crea Backup Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
