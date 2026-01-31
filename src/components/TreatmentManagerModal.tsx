import { useState } from 'react';
import { X, Plus, Trash2, Pencil, Save, Settings, AlertTriangle } from 'lucide-react';
import { useTreatments } from '../hooks/useTreatments';
import toast from 'react-hot-toast';
import { type Treatment } from '../types';
import ConfirmModal from './ConfirmModal';

interface TreatmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TreatmentManagerModal({ isOpen, onClose }: TreatmentManagerModalProps) {
  const { treatments, addTreatment, updateTreatment, deleteTreatment, loading } = useTreatments();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [editName, setEditName] = useState('');
  
  // Custom Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreatmentName.trim()) return;
    try {
      await addTreatment(newTreatmentName.trim());
      setNewTreatmentName('');
      toast.success('Servizio aggiunto!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Errore aggiunta';
      toast.error(msg);
    }
  };

  const startEdit = (t: Treatment) => {
    setEditingId(t.id);
    setEditName(t.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateTreatment(editingId, editName.trim());
      setEditingId(null);
      toast.success('Aggiornato!');
    } catch {
      toast.error('Errore aggiornamento');
    }
  };

  const confirmDelete = async () => {
     if (!itemToDelete) return;
     try {
       await deleteTreatment(itemToDelete.id);
       toast.success('Eliminato');
     } catch {
       toast.error('Impossibile eliminare');
     } finally {
       setItemToDelete(null);
     }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Settings size={20} /> Gestione Listino
          </h2>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
           <form onSubmit={handleAdd} className="flex gap-2">
             <input 
               value={newTreatmentName}
               onChange={(e) => setNewTreatmentName(e.target.value)}
               placeholder="Nome nuovo servizio..."
               className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
             <button 
               type="submit"
               disabled={!newTreatmentName.trim()} 
               className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
             >
               <Plus size={20} />
             </button>
           </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
             <div className="text-center p-4 text-slate-400">Caricamento...</div>
          ) : treatments.length === 0 ? (
             <div className="text-center p-8 text-slate-500">
                <p className="mb-4">Il tuo listino è vuoto.</p>
                <p className="text-xs">Usa il form in alto per aggiungere servizi.</p>
             </div>
          ) : (
            treatments.map(t => (
              <div key={t.id} className="group flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                {editingId === t.id ? (
                    <div className="flex flex-1 gap-2">
                        <input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={18} /></button>
                    </div>
                ) : (
                    <>
                        <span className="text-sm font-medium text-slate-700">{t.name}</span>
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                <Pencil size={16} />
                            </button>
                            <button onClick={() => setItemToDelete({ id: t.id, name: t.name })} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-amber-50 text-amber-800 text-xs border-t border-amber-100 flex items-start gap-2">
           <AlertTriangle size={14} className="shrink-0 mt-0.5" />
           <p>Attenzione: eliminare un servizio non lo cancella dallo storico appuntamenti passato, ma non sarà più selezionabile per il futuro.</p>
        </div>
      </div>
    </div>

    <ConfirmModal
        isOpen={!!itemToDelete}
        title="Elimina Servizio"
        message={`Sei SICURO di voler eliminare "${itemToDelete?.name}" dal listino? Questa azione è irreversibile.`}
        confirmText="Elimina"
        cancelText="Annulla"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
    />
    </>
  );
}
