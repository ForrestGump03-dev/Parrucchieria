import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar, Euro, FileText, Phone, User, Save, History as HistoryIcon, Pencil, Trash2, X } from 'lucide-react';
import { type Client, type Appointment } from '../types';
import { useAppointments } from '../hooks/useAppointments';

interface AppointmentFormProps {
  selectedClient?: Client;
  onClientUpdated: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  date: string;
  treatment: string;
  price: number;
}

export default function AppointmentForm({ selectedClient, onClientUpdated }: AppointmentFormProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const { addAppointment, getLastPriceForTreatment, getClientHistory, deleteAppointment, updateAppointment } = useAppointments();
  const [history, setHistory] = useState<Appointment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const treatmentValue = watch('treatment');

  useEffect(() => {
    if (selectedClient) {
      // If we are NOT editing an old appointment, reset form to client defaults
      if (!editingId) {
        setValue('first_name', selectedClient.first_name);
        setValue('last_name', selectedClient.last_name);
        setValue('phone', selectedClient.phone);
        setValue('treatment', '');
        setValue('price', 0);
        setValue('date', format(new Date(), 'yyyy-MM-dd'));
      }
      fetchHistory(selectedClient.id);
    } else {
      setHistory([]);
      cancelEdit();
    }
  }, [selectedClient, setValue]); // editingId dependency removed to prevent loop, but careful logic needed

  const handleTreatmentBlur = async () => {
    // Only auto-fill price if we are adding new, or if user changed treatment and price is 0?
    // Let's keep it simple: if adding new and treatment changes, fetch price.
    if (treatmentValue && !editingId) {
      const price = await getLastPriceForTreatment(treatmentValue);
      if (price !== null) {
        setValue('price', price);
      }
    }
  };

  async function fetchHistory(clientId: string) {
    const data = await getClientHistory(clientId);
    setHistory(data || []);
  }

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setValue('date', apt.date);
    setValue('treatment', apt.treatment);
    setValue('price', apt.price);
    // Client info is already set because selectedClient is active
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    if (selectedClient) {
      setValue('treatment', '');
      setValue('price', 0);
      setValue('date', format(new Date(), 'yyyy-MM-dd'));
    } else {
      reset();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo trattamento dallo storico?')) {
      try {
        await deleteAppointment(id);
        if (selectedClient) fetchHistory(selectedClient.id);
      } catch (err) {
        alert('Errore eliminazione');
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      let clientId = selectedClient?.id;

      if (!clientId) {
         const { supabase } = await import('../lib/supabase');
         const { data: newClient, error } = await supabase.from('clients').insert([{
             first_name: data.first_name,
             last_name: data.last_name,
             phone: data.phone
         }]).select().single();
         
         if (error) throw error;
         clientId = newClient.id;
         onClientUpdated();
      }

      if (editingId) {
        await updateAppointment(editingId, {
          date: data.date,
          treatment: data.treatment,
          price: Number(data.price),
          // Keep existing start_time or update? For simplicity, we don't change time here yet unless we add field.
        });
        alert('Appuntamento aggiornato!');
        setEditingId(null);
      } else {
        // Default time for "Cashier" mode: Current Time
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        await addAppointment({
          client_id: clientId!,
          date: data.date,
          start_time: timeString,
          treatment: data.treatment,
          price: Number(data.price),
        });
        alert('Appuntamento registrato!');
      }

      if (selectedClient || clientId) fetchHistory(selectedClient?.id || clientId!);
      
      if (!editingId) {
        setValue('treatment', '');
        setValue('price', 0);
      } else {
        cancelEdit(); // Reset form after edit
      }
      
    } catch (err) {
      console.error(err);
      alert('Errore nel salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className={`bg-white p-6 rounded-xl shadow-sm border ${editingId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="text-amber-500" size={20} />
                Modifica Trattamento
              </>
            ) : (
              <>
                <FileText className="text-indigo-600" size={20} />
                Nuovo Trattamento
              </>
            )}
          </h2>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
              <X size={16} /> Annulla Modifica
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dati Cliente</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    {...register('first_name', { required: true })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Nome"
                    readOnly={!!selectedClient}
                    // If modifying, we shouldn't actally change the client person, just the appointment
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cognome</label>
                <input
                  {...register('last_name', { required: true })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Cognome"
                  readOnly={!!selectedClient}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  {...register('phone', { required: true })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Numero di telefono"
                  readOnly={!!selectedClient}
                />
              </div>
            </div>
          </div>

          {/* Treatment Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dettagli Trattamento</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  {...register('date', { required: true })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trattamento</label>
              <input
                {...register('treatment', { required: true })}
                onBlur={handleTreatmentBlur}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Es. Taglio, Piega..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo (€)</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: true, min: 0 })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          {editingId && (
            <button
               type="button"
               onClick={cancelEdit}
               className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
            >
              Annulla
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-md ${
              editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-70`}
          >
            <Save size={18} />
            {submitting ? 'Salvataggio...' : (editingId ? 'Aggiorna Trattamento' : 'Registra Trattamento')}
          </button>
        </div>
      </form>

      {/* History Section */}
      {selectedClient && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <HistoryIcon className="text-slate-500" size={18} />
               <h3 className="font-semibold text-slate-800">Storico Trattamenti - {selectedClient.first_name} {selectedClient.last_name}</h3>
             </div>
             <span className="text-xs text-slate-400 font-normal">{history.length} trattamenti trovati</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left text-slate-600">
               <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                 <tr>
                   <th className="px-6 py-3">Data</th>
                   <th className="px-6 py-3">Trattamento</th>
                   <th className="px-6 py-3 text-right">Prezzo</th>
                   <th className="px-6 py-3 text-center">Azioni</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {history.length > 0 ? (
                   history.map((item) => (
                     <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${editingId === item.id ? 'bg-indigo-50/60' : ''}`}>
                       <td className="px-6 py-4 font-medium whitespace-nowrap">{format(new Date(item.date), 'dd/MM/yyyy')}</td>
                       <td className="px-6 py-4">{item.treatment}</td>
                       <td className="px-6 py-4 text-right font-semibold">€ {item.price.toFixed(2)}</td>
                       <td className="px-6 py-4">
                         <div className="flex justify-center gap-2">
                           <button 
                             onClick={() => handleEdit(item)}
                             className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                             title="Modifica"
                           >
                             <Pencil size={16} />
                           </button>
                           <button 
                             onClick={() => handleDelete(item.id)}
                             className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                             title="Elimina"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                       <p className="mb-2">Nessun trattamento registrato per questo cliente.</p>
                       <span className="text-xs text-slate-300">Compila il form sopra per aggiungerne uno.</span>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
}
