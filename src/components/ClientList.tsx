import { useState, useEffect } from 'react';
import { Search, User, Trash2, Crown, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client } from '../types';
import { useClients } from '../hooks/useClients';
import { useWinback } from '../hooks/useWinback';
import { useReminders } from '../hooks/useReminders';
import ConfirmModal from './ConfirmModal';

interface ClientListProps {
  onSelect: (client: Client) => void;
  selectedClientId?: string;
  onClientDeleted?: () => void;
}

export default function ClientList({ onSelect, selectedClientId, onClientDeleted }: ClientListProps) {
  const [search, setSearch] = useState('');
  const { clients, totalCount, loading, fetchClients, deleteClient } = useClients();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    idToDelete?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });



  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Elimina Cliente",
      message: "Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i suoi appuntamenti. L'azione è irreversibile.",
      onConfirm: async () => {
        try {
          await deleteClient(id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          fetchClients({ page: currentPage, limit: itemsPerPage, search, sortOrder, activeTab: activeTab === 'birthdays' ? 'birthdays' : 'all' });
          if (onClientDeleted) onClientDeleted();
          toast.success("Cliente eliminato con successo");
        } catch {
          toast.error('Errore eliminazione cliente');
        }
      }
    });
  };

  const { settings } = useReminders();
  const { candidates, loading: winbackLoading } = useWinback(settings.winbackDays || 60);
  const [activeTab, setActiveTab] = useState<'all' | 'winback' | 'birthdays'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'a-z' | 'recent'>('a-z');
  const itemsPerPage = 15;

  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'birthdays') {
      fetchClients({
        page: currentPage,
        limit: itemsPerPage,
        search,
        sortOrder,
        activeTab: activeTab === 'birthdays' ? 'birthdays' : 'all'
      });
    }
  }, [fetchClients, currentPage, itemsPerPage, search, sortOrder, activeTab]);

  const totalPages = activeTab === 'winback' 
    ? Math.ceil(candidates.length / itemsPerPage) 
    : Math.ceil((totalCount || 0) / itemsPerPage);

  const currentItems = activeTab === 'winback'
    ? candidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : clients;

  const isLoading = activeTab === 'winback' ? winbackLoading : loading;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-800 mb-3">Seleziona Cliente</h2>
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Nome, cognome o telefono..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Ordina per :</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'a-z' | 'recent');
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white text-slate-700"
            >
              <option value="a-z">A-Z</option>
              <option value="recent">Recenti</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 mx-4 mt-2 rounded-lg gap-1">
        <button
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Tutti
        </button>
        <button
          onClick={() => { setActiveTab('winback'); setCurrentPage(1); }}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === 'winback' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
          title="Da Recuperare"
        >
          Recupero {candidates.length > 0 && `(${candidates.length})`}
        </button>
        <button
          onClick={() => { setActiveTab('birthdays'); setCurrentPage(1); }}
          className={`flex-[1.1] flex justify-center flex-wrap items-center gap-1 text-[11px] sm:text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === 'birthdays' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Gift size={12} /> Compleanni
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-center text-slate-500 text-sm">Caricamento...</div>
        ) : currentItems.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            {activeTab === 'winback' ? 'Ottimo lavoro! Nessun cliente da recuperare.' : 'Nessun cliente trovato'}
          </div>
        ) : (
          <>
            {currentItems.map((client) => (
              <div
                key={client.id}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group ${selectedClientId === client.id
                    ? (activeTab === 'winback' ? 'bg-amber-50 ring-1 ring-amber-200' : activeTab === 'birthdays' ? 'bg-pink-50 ring-1 ring-pink-200' : 'bg-indigo-50 ring-1 ring-indigo-200')
                    : 'hover:bg-slate-50'
                  }`}
              >
                <button
                  onClick={() => onSelect(client)}
                  className={`flex-1 text-left flex flex-col`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full flex-shrink-0 ${selectedClientId === client.id
                        ? (activeTab === 'winback' ? 'bg-amber-100 text-amber-600' : activeTab === 'birthdays' ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600')
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                      {activeTab === 'birthdays' ? <Gift size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <p className={`font-medium leading-tight flex items-center gap-1 ${selectedClientId === client.id ? (activeTab === 'winback' ? 'text-amber-800' : activeTab === 'birthdays' ? 'text-pink-800' : 'text-indigo-700') : 'text-slate-700'}`}>
                        {client.first_name} {client.last_name}
                        {client.is_vip && (
                          <span title="Cliente VIP">
                            <Crown size={14} className="text-yellow-500" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{client.phone || 'Nessun telefono'}</p>
                    </div>
                  </div>
                  {activeTab === 'winback' && 'days_since' in client && (
                    <div className="mt-2 ml-10 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 self-start px-2 py-0.5 rounded border border-amber-100">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      Manca da {(client as any).days_since} giorni
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => handleDelete(e, client.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Elimina cliente"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 px-3 flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:text-slate-600 disabled:hover:bg-transparent transition-colors"
                  title="Pagina precedente"
                >
                  <ChevronLeft size={16} /> Indietro
                </button>
                <span className="text-xs font-medium text-slate-500">
                  Pagina {currentPage} di {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 px-3 flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:text-slate-600 disabled:hover:bg-transparent transition-colors"
                  title="Pagina successiva"
                >
                  Avanti <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDanger={true}
        confirmText="Elimina definitivamente"
      />
    </div>
  );
}
