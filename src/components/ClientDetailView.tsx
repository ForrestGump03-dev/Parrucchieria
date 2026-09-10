import { useEffect, useState, useMemo } from 'react';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Users,
  DollarSign,
  CreditCard,
  Package,
  Star,
  Filter,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useDetailedReport,
  type DetailedClientRow,
  type ClientAppointmentDetail,
} from '../hooks/useDetailedReport';
import { type DateRange } from '../hooks/useStats';
import { cn, exportToCsv } from '../lib/utils';

// ─── Tipi locali ─────────────────────────────────────────────────────────────

type SortKey = 'spent' | 'name' | 'visits' | 'lastVisit';

interface RankedClient extends DetailedClientRow {
  rank: number;      // 0 = spesa più alta del periodo
  maxSpent: number;  // spesa massima (per la barra relativa)
}

// ─── Costanti colori avatar ───────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash * 31) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Sub-componenti ───────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0)
    return (
      <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <Star size={9} fill="currentColor" /> Top 1
      </span>
    );
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <Star size={9} fill="currentColor" /> Top 2
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <Star size={9} fill="currentColor" /> Top 3
      </span>
    );
  return null;
}

// ─── Riga cliente espandibile ─────────────────────────────────────────────────

function ClientRow({
  client,
  isExpanded,
  isRevealed = true,
  onToggle,
}: {
  client: RankedClient;
  isExpanded: boolean;
  isRevealed?: boolean;
  onToggle: () => void;
}) {
  const avatarColor = getAvatarColor(client.clientName);
  const spendPct = client.maxSpent > 0 ? (client.totalSpent / client.maxSpent) * 100 : 0;

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-b border-slate-100 transition-colors',
          isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
        )}
        onClick={onToggle}
      >
        {/* Avatar + Nome + barra spesa relativa */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                avatarColor
              )}
            >
              {client.clientName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 text-sm leading-tight truncate">
                {client.clientName}
              </div>
              <div className="text-xs text-slate-400">{client.phone || '—'}</div>
              <div className="mt-1 w-20 bg-slate-100 rounded-full h-1">
                <div
                  className="bg-indigo-400 h-1 rounded-full transition-all duration-500"
                  style={{ width: isRevealed ? `${spendPct}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </td>

        {/* Badges */}
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            <RankBadge rank={client.rank} />
            {client.isNewClient && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                Nuovo
              </span>
            )}
          </div>
        </td>

        {/* Visite */}
        <td className="px-3 py-3 text-center">
          <span className="text-sm font-bold text-slate-700">{client.visits}</span>
        </td>

        {/* Trattamenti (pills top 3) */}
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {client.topTreatments.map(t => (
              <span
                key={t.name}
                className="bg-indigo-50 text-indigo-700 text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
              >
                {t.name} ×{t.count}
              </span>
            ))}
          </div>
        </td>

        {/* Prodotti */}
        <td className="px-3 py-3 text-right">
          <span className={cn('text-sm font-medium transition-all duration-300', !isRevealed && 'blur-sm select-none', client.productsRevenue > 0 ? 'text-emerald-700' : 'text-slate-300')}>
            {client.productsRevenue > 0 ? `€ ${client.productsRevenue.toFixed(2)}` : '—'}
          </span>
        </td>

        {/* Totale + scontrino medio */}
        <td className="px-3 py-3 text-right">
          <div className={cn("text-sm font-bold text-slate-800 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
            € {client.totalSpent.toFixed(2)}
          </div>
          <div className={cn("text-[10px] text-slate-400 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
            media € {client.avgPerVisit.toFixed(0)}
          </div>
        </td>

        {/* Ultima visita + staff */}
        <td className="px-3 py-3 text-right">
          <div className="text-xs font-medium text-slate-600">
            {format(parse(client.lastVisitDate, 'yyyy-MM-dd', new Date()), 'dd MMM', { locale: it })}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[80px] ml-auto">{client.lastStaff}</div>
        </td>

        {/* Icona espansione */}
        <td className="px-3 py-3 text-center">
          {isExpanded
            ? <ChevronDown size={16} className="text-indigo-500 mx-auto" />
            : <ChevronRight size={16} className="text-slate-400 mx-auto" />
          }
        </td>
      </tr>

      {/* ── Tabella interna espansa ── */}
      {isExpanded && (
        <tr>
          <td
            colSpan={8}
            className="bg-indigo-50/20 border-b border-indigo-100 px-4 pb-4 pt-0"
          >
            <div className="ml-12 border-l-2 border-indigo-200 pl-4 pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Data', 'Ora', 'Trattamento', 'Prodotti venduti', 'Staff', 'Note', '€ Serv.', '€ Prod.', 'Totale'].map(h => (
                      <th
                        key={h}
                        className={cn(
                          'pb-2 font-semibold text-slate-400 uppercase tracking-wide',
                          ['€ Serv.', '€ Prod.', 'Totale'].includes(h) ? 'text-right pr-0 pl-4' : 'text-left pr-4'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {client.appointments.map(apt => (
                    <AptSubRow key={apt.id} apt={apt} isRevealed={isRevealed} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td colSpan={6} className="pt-2 text-slate-500">
                      {client.visits} visita{client.visits !== 1 ? 'e' : ''} nel periodo
                    </td>
                    <td className={cn("pt-2 text-right pl-4 text-slate-700 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
                      € {client.servicesRevenue.toFixed(2)}
                    </td>
                    <td className={cn("pt-2 text-right pl-4 text-emerald-700 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
                      {client.productsRevenue > 0 ? `€ ${client.productsRevenue.toFixed(2)}` : '—'}
                    </td>
                    <td className={cn("pt-2 text-right pl-4 text-indigo-700 font-bold transition-all duration-300", !isRevealed && "blur-sm select-none")}>
                      € {client.totalSpent.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AptSubRow({ apt, isRevealed = true }: { apt: ClientAppointmentDetail; isRevealed?: boolean }) {
  return (
    <tr className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition-colors">
      <td className="py-2 pr-4 font-medium text-slate-700 whitespace-nowrap">
        {format(parse(apt.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy', { locale: it })}
      </td>
      <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
        {apt.start_time ? apt.start_time.substring(0, 5) : '—'}
      </td>
      <td className="py-2 pr-4">
        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap">
          {apt.treatment}
        </span>
      </td>
      <td className="py-2 pr-4">
        {apt.products.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {apt.products.map((p, i) => (
              <span
                key={i}
                className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap"
              >
                {p.name} ×{p.quantity}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{apt.staffName}</td>
      <td className="py-2 pr-4 text-slate-400 italic max-w-[100px] truncate">{apt.notes || '—'}</td>
      <td className={cn("py-2 pl-4 text-right text-slate-700 whitespace-nowrap transition-all duration-300", !isRevealed && "blur-sm select-none")}>
        € {apt.servicePrice.toFixed(2)}
      </td>
      <td className={cn("py-2 pl-4 text-right whitespace-nowrap transition-all duration-300", !isRevealed && "blur-sm select-none")}>
        {apt.productsRevenue > 0 ? (
          <span className="text-emerald-700">€ {apt.productsRevenue.toFixed(2)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className={cn("py-2 pl-4 text-right font-bold text-slate-800 whitespace-nowrap transition-all duration-300", !isRevealed && "blur-sm select-none")}>
        € {apt.totalPrice.toFixed(2)}
      </td>
    </tr>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

interface Props {
  range: DateRange;
  onClose: () => void;
  isRevealed?: boolean;
  onToggleReveal?: () => void;
  onRequestUnlock?: (callback: () => void) => void;
}

export default function ClientDetailView({
  range: initialRange,
  onClose,
  isRevealed = true,
  onToggleReveal,
  onRequestUnlock,
}: Props) {
  const { data, loading, fetchDetailedReport } = useDetailedReport();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedRange, setSelectedRange] = useState<DateRange>(initialRange);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDates, setCustomDates] = useState({
    start: format(initialRange.start, 'yyyy-MM-dd'),
    end: format(initialRange.end, 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchDetailedReport(selectedRange);
  }, [fetchDetailedReport, selectedRange]);

  const handleRangeChange = (rangeType: string) => {
    const today = new Date();
    let newRange: DateRange;
    if (rangeType === 'custom') { setShowCustomPicker(true); return; }
    setShowCustomPicker(false);
    switch (rangeType) {
      case 'today':     newRange = { start: startOfDay(today), end: endOfDay(today), label: 'Oggi' }; break;
      case 'week':      newRange = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }), label: 'Questa Settimana' }; break;
      case 'month':     newRange = { start: startOfMonth(today), end: endOfMonth(today), label: 'Questo Mese' }; break;
      case 'lastMonth': { const lm = subMonths(today, 1); newRange = { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Mese Scorso' }; break; }
      case 'year':      newRange = { start: startOfYear(today), end: endOfYear(today), label: "Quest'Anno" }; break;
      default: return;
    }
    setSelectedRange(newRange);
    setExpandedIds(new Set());
  };

  const applyCustomRange = () => {
    const start = startOfDay(parse(customDates.start, 'yyyy-MM-dd', new Date()));
    const end = endOfDay(parse(customDates.end, 'yyyy-MM-dd', new Date()));
    if (!isValid(start) || !isValid(end) || start > end) return;
    setSelectedRange({ start, end, label: 'Personalizzato' });
    setExpandedIds(new Set());
  };

  // Calcola rank e maxSpent in base alla spesa totale decrescente
  const rankedClients = useMemo<RankedClient[]>(() => {
    if (!data) return [];
    const bySpent = [...data.clients].sort((a, b) => b.totalSpent - a.totalSpent);
    const rankMap = new Map(bySpent.map((c, i) => [c.clientId, i]));
    const maxSpent = bySpent[0]?.totalSpent ?? 0;
    return data.clients.map(c => ({
      ...c,
      rank: rankMap.get(c.clientId) ?? 999,
      maxSpent,
    }));
  }, [data]);

  // Filtra + ordina
  const filtered = useMemo<RankedClient[]>(() => {
    const lowerSearch = search.toLowerCase();
    let rows = rankedClients.filter(
      c =>
        c.clientName.toLowerCase().includes(lowerSearch) ||
        c.phone.includes(search)
    );
    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'name':      return a.clientName.localeCompare(b.clientName, 'it');
        case 'spent':     return b.totalSpent - a.totalSpent;
        case 'visits':    return b.visits - a.visits;
        case 'lastVisit': return b.lastVisitDate.localeCompare(a.lastVisitDate);
        default:          return 0;
      }
    });
    return rows;
  }, [rankedClients, search, sortKey]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const allExpanded = expandedIds.size >= filtered.length && filtered.length > 0;

  const handleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filtered.map(c => c.clientId)));
    }
  };

  const handleExport = () => {
    if (!data) return;
    const rows = filtered.map(c => ({
      'Cliente': c.clientName,
      'Telefono': c.phone,
      'Visite': c.visits,
      'Trattamenti principali': c.topTreatments.map(t => `${t.name} x${t.count}`).join('; '),
      '€ Servizi': c.servicesRevenue.toFixed(2),
      '€ Prodotti': c.productsRevenue.toFixed(2),
      'Totale speso': c.totalSpent.toFixed(2),
      'Media per visita': c.avgPerVisit.toFixed(2),
      'Ultima visita': c.lastVisitDate,
      'Nuovo cliente': c.isNewClient ? 'Sì' : 'No',
    }));
    const rangeLabel = `${format(selectedRange.start, 'yyyy-MM-dd')}_${format(selectedRange.end, 'yyyy-MM-dd')}`;
    exportToCsv(`registro_dettagliato_${rangeLabel}.csv`, rows);
  };

  const summary = data?.summary;
  const rangeLabel = `${format(selectedRange.start, 'dd MMM', { locale: it })} – ${format(selectedRange.end, 'dd MMM yyyy', { locale: it })}`;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-500 text-sm">Caricamento registro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm flex-shrink-0"
            >
              <ArrowLeft size={17} />
              Torna al Report
            </button>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800">Registro Clienti Dettagliato</h1>
              <p className="text-slate-400 text-xs mt-0.5">Periodo: {rangeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onToggleReveal && (
              <button
                onClick={onToggleReveal}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm border",
                  isRevealed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
                title={isRevealed ? "Nascondi fatturato (sfoca)" : "Mostra fatturato (richiede PIN)"}
              >
                {isRevealed ? <EyeOff size={15} className="text-emerald-600" /> : <Eye size={15} className="text-slate-500" />}
                <span>{isRevealed ? "Nascondi" : "Mostra"}</span>
              </button>
            )}
            <button
              onClick={() => {
                if (onRequestUnlock && !isRevealed) {
                  onRequestUnlock(handleExport);
                } else {
                  handleExport();
                }
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={15} />
              Esporta CSV
            </button>
          </div>
        </div>

        {/* Selettore periodo */}
        <div className="flex flex-col gap-2">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm overflow-x-auto self-start">
            {[
              { id: 'today', label: 'Oggi' },
              { id: 'week', label: 'Settimana' },
              { id: 'month', label: 'Mese' },
              { id: 'lastMonth', label: 'Mese Scorso' },
              { id: 'year', label: 'Anno' },
              { id: 'custom', label: 'Personalizzato' },
            ].map(period => (
              <button
                key={period.id}
                onClick={() => handleRangeChange(period.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedRange.label === (
                    period.id === 'lastMonth' ? 'Mese Scorso' :
                    period.id === 'year' ? "Quest'Anno" :
                    period.id === 'today' ? 'Oggi' :
                    period.id === 'week' ? 'Questa Settimana' :
                    period.id === 'custom' ? 'Personalizzato' : 'Questo Mese'
                  )
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          {showCustomPicker && (
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-3 self-start">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Dal:</span>
                <input
                  type="date" value={customDates.start}
                  onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <ArrowRight size={14} className="text-slate-400" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Al:</span>
                <input
                  type="date" value={customDates.end}
                  onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={applyCustomRange}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Applica
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg flex-shrink-0">
            <Users size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Clienti Unici</p>
            <p className="text-2xl font-bold text-slate-800">{summary?.uniqueClients ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Visite Totali</p>
            <p className="text-2xl font-bold text-slate-800">{summary?.totalVisits ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg flex-shrink-0">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Incasso Totale</p>
            <p className={cn("text-xl font-bold text-slate-800 transition-all duration-300", !isRevealed && "blur-md select-none")}>
              € {(summary?.totalRevenue ?? 0).toFixed(2)}
            </p>
            <p className={cn("text-[10px] text-slate-400 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
              di cui € {(summary?.totalProductRevenue ?? 0).toFixed(2)} prodotti
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-lg flex-shrink-0">
            <Package size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Scontrino Medio</p>
            <p className={cn("text-2xl font-bold text-slate-800 transition-all duration-300", !isRevealed && "blur-md select-none")}>
              € {(summary?.avgTicket ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* Ricerca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome o telefono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Ordinamento */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="spent">Totale Speso ↓</option>
              <option value="visits">N° Visite ↓</option>
              <option value="name">Nome A → Z</option>
              <option value="lastVisit">Ultima Visita</option>
            </select>
          </div>

          {/* Espandi / Comprimi tutti */}
          {filtered.length > 0 && (
            <button
              onClick={handleExpandAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {allExpanded ? '▲ Comprimi tutti' : '▼ Espandi tutti'}
            </button>
          )}

          {/* Contatore risultati */}
          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} client{filtered.length !== 1 ? 'i' : 'e'}
          </span>
        </div>
      </div>

      {/* ── Stato vuoto ── */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-14 text-center">
          <Users size={44} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-semibold">Nessun cliente trovato nel periodo selezionato</p>
          <p className="text-slate-400 text-sm mt-1">
            {search ? 'Prova a modificare la ricerca' : 'Seleziona un periodo con appuntamenti registrati in cassa'}
          </p>
        </div>
      )}

      {/* ── Vista Per Cliente ── */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Badge</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Visite</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trattamenti eseguiti</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Prodotti</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Totale / Media</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ultima Visita</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <ClientRow
                    key={client.clientId}
                    client={client}
                    isExpanded={expandedIds.has(client.clientId)}
                    isRevealed={isRevealed}
                    onToggle={() => toggleExpand(client.clientId)}
                  />
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700" colSpan={2}>
                    Totale ({filtered.length} clienti)
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-slate-700">
                    {filtered.reduce((s, c) => s + c.visits, 0)}
                  </td>
                  <td className="px-3 py-3" />
                  <td className={cn("px-3 py-3 text-right text-sm font-bold text-emerald-700 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
                    € {filtered.reduce((s, c) => s + c.productsRevenue, 0).toFixed(2)}
                  </td>
                  <td className={cn("px-3 py-3 text-right text-sm font-bold text-indigo-700 transition-all duration-300", !isRevealed && "blur-sm select-none")}>
                    € {filtered.reduce((s, c) => s + c.totalSpent, 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
