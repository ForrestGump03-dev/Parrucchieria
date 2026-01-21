import { useState } from 'react';
import { Search, User, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client } from '../types';
import { useClients } from '../hooks/useClients';
import ConfirmModal from './ConfirmModal';

interface ClientListProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  selectedClientId?: string;
  loading?: boolean;
  onClientDeleted?: () => void;
}

export default function ClientList({ clients, onSelect, selectedClientId, loading, onClientDeleted }: ClientListProps) {
  const [search, setSearch] = useState('');
  const { deleteClient } = useClients();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    idToDelete?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(term) ||
      client.last_name.toLowerCase().includes(term) ||
      client.phone.includes(term)
    );
  });

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
          if (onClientDeleted) onClientDeleted();
          toast.success("Cliente eliminato con successo");
        } catch (err) {
          toast.error('Errore eliminazione cliente');
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-800 mb-3">Seleziona Cliente</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cerca nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
           <div className="p-4 text-center text-slate-500 text-sm">Caricamento...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">Nessun cliente trovato</div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group ${
                selectedClientId === client.id
                  ? 'bg-indigo-50 ring-1 ring-indigo-200'
                  : 'hover:bg-slate-50'
              }`}
            >
            <button
              onClick={() => onSelect(client)}
              className={`flex-1 text-left flex items-center gap-3 ${
                selectedClientId === client.id
                  ? 'text-indigo-700'
                  : 'text-slate-700'
              }`}
            >
              <div className={`p-2 rounded-full ${selectedClientId === client.id ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <User size={18} />
              </div>
              <div>
                <p className="font-medium leading-tight">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs opacity-70 mt-0.5">{client.phone}</p>
              </div>
            </button>
            <button
                onClick={(e) => handleDelete(e, client.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Elimina cliente"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
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
