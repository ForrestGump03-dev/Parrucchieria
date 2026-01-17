import { useState } from 'react';
import { Search, User } from 'lucide-react';
import { type Client } from '../types';

interface ClientListProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  selectedClientId?: string;
  loading?: boolean;
}

export default function ClientList({ clients, onSelect, selectedClientId, loading }: ClientListProps) {
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(term) ||
      client.last_name.toLowerCase().includes(term) ||
      client.phone.includes(term)
    );
  });

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
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                selectedClientId === client.id
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'hover:bg-slate-50 text-slate-700'
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
          ))
        )}
      </div>
    </div>
  );
}
