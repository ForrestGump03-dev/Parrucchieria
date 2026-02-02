import { useState } from 'react';
import { X, Plus, Trash2, Pencil, Settings, User } from 'lucide-react';
import { useStaff } from '../hooks/useStaff';
import toast from 'react-hot-toast';
import { type StaffMember } from '../types';
import ConfirmModal from './ConfirmModal';

interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffManagerModal({ isOpen, onClose }: StaffManagerModalProps) {
  const { staff, addStaff, updateStaff, deleteStaff, loading } = useStaff();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  
  // State for confirm modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (staff.length >= 7) {
      toast.error('Hai raggiunto il limite massimo di 7 collaboratori.');
      return;
    }

    try {
      await addStaff(newName.trim());
      setNewName('');
      toast.success('Collaboratore aggiunto!');
    } catch (error) {
       console.error(error);
       toast.error('Errore aggiunta');
    }
  };

  const startEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateStaff(editingId, { name: editName.trim() });
      setEditingId(null);
      toast.success('Aggiornato!');
    } catch {
      toast.error('Errore aggiornamento');
    }
  };

  const openDeleteModal = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
        await deleteStaff(deleteId);
        toast.success('Eliminato');
    } catch {
        toast.error('Errore eliminazione');
    } finally {
        setDeleteId(null);
    }
  };

  return (
    <>
      <div className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4'>
        <div className='bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]'>
          <div className='p-4 bg-slate-800 text-white flex justify-between items-center'>
            <h2 className='font-semibold flex items-center gap-2'>
              <User size={20} /> Gestione Staff
            </h2>
            <button onClick={onClose} className='hover:bg-slate-700 p-1 rounded'>
              <X size={20} />
            </button>
          </div>

          <div className='p-4 border-b border-slate-100'>
             <form onSubmit={handleAdd} className='flex gap-2'>
               <input 
                 value={newName}
                 onChange={(e) => setNewName(e.target.value)}
                 placeholder='Nome collaboratore...'
                 className='flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
               />
               <button 
                 type='submit'
                 disabled={!newName.trim()} 
                 className='bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50'
               >
                 <Plus size={20} />
               </button>
             </form>
          </div>

          <div className='flex-1 overflow-y-auto p-2 space-y-1'>
            {loading ? (
               <div className='text-center p-4 text-slate-400'>Caricamento...</div>
            ) : staff.length === 0 ? (
               <div className='text-center p-8 text-slate-500'>
                  <p>Nessun collaboratore.</p>
                  <p className='text-xs mt-1'>Aggiungi i nomi per abilitare le colonne in agenda.</p>
               </div>
            ) : (
              <ul className='space-y-2'>
                 {staff.map(s => (
                   <li key={s.id} className='flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors'>
                      {editingId === s.id ? (
                          <div className='flex gap-2 flex-1'>
                             <input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className='flex-1 px-2 py-1 text-sm border rounded'
                             />
                             <button onClick={saveEdit} className='text-green-600 hover:text-green-800'><Settings size={16}/></button> 
                             <button onClick={() => setEditingId(null)} className='text-slate-400'><X size={16}/></button>
                          </div>
                      ) : (
                          <>
                             <span className='font-medium text-slate-700'>{s.name}</span>
                             <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button onClick={() => startEdit(s)} className='text-indigo-500 hover:text-indigo-700 p-1'>
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => openDeleteModal(s.id)} className='text-red-400 hover:text-red-600 p-1'>
                                  <Trash2 size={16} />
                                </button>
                             </div>
                          </>
                      )}
                   </li>
                 ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        title="Elimina Collaboratore"
        message="Sei sicuro di voler eliminare questo collaboratore? Tutte le sue attività rimarranno assegnate ma il nome non sarà più selezionabile."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
        isDanger={true}
        confirmText="Elimina"
      />
    </>
  );
}
