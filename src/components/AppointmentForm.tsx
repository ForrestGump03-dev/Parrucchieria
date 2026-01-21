import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar, FileText, Phone, User, History as HistoryIcon, Pencil, Trash2, X, Plus, ShoppingBag } from 'lucide-react';
import { type Client, type Appointment } from '../types';
import { useAppointments } from '../hooks/useAppointments';
import { TREATMENTS } from '../constants/treatments';
import { supabase } from '../lib/supabase';

interface AppointmentFormProps {
  selectedClient?: Client;
  onClientUpdated: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  date: string;
  // removed single treatment/price
}

interface ServiceItem {
  treatment: string;
  price: number;
}

export default function AppointmentForm({ selectedClient, onClientUpdated }: AppointmentFormProps) {
  const { register, handleSubmit, setValue, reset } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const { addAppointment, getLastPriceForTreatment, getClientHistory, deleteAppointment, updateAppointment } = useAppointments();
  const [history, setHistory] = useState<Appointment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Multi-service state
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [currentTreatment, setCurrentTreatment] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>('');

  const handleTreatmentSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrentTreatment(val);
    if (val) {
      const price = await getLastPriceForTreatment(val);
      if (price !== null) {
        setCurrentPrice(price.toString());
      }
    } else {
      setCurrentPrice('');
    }
  };

  const addService = () => {
    if (!currentTreatment || !currentPrice) return;
    setSelectedServices([...selectedServices, { treatment: currentTreatment, price: Number(currentPrice) }]);
    setCurrentTreatment('');
    setCurrentPrice('');
  };

  const removeService = (index: number) => {
    const newServices = [...selectedServices];
    newServices.splice(index, 1);
    setSelectedServices(newServices);
  };

  /* Restore useEffect for client selection reset */
  useEffect(() => {
    if (selectedClient) {
      if (!editingId) {
        setValue('first_name', selectedClient.first_name);
        setValue('last_name', selectedClient.last_name);
        setValue('phone', selectedClient.phone);
        setValue('date', format(new Date(), 'yyyy-MM-dd'));
        setSelectedServices([]);
      }
      fetchHistory(selectedClient.id);
    } else {
      setHistory([]);
      cancelEdit();
    }
  }, [selectedClient, setValue]); 

  async function fetchHistory(clientId: string) {
    const data = await getClientHistory(clientId);
    setHistory(data || []);
  }

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setValue('date', apt.date);
    // For editing, we load just that one service as a single item list
    setSelectedServices([{ treatment: apt.treatment, price: apt.price || 0 }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedServices([]);
    if (selectedClient) {
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
    if (selectedServices.length === 0) {
      alert('Seleziona almeno un trattamento');
      return;
    }
    setSubmitting(true);
    try {
      let clientId = selectedClient?.id;

      if (!clientId) {
         const { data: newClient, error } = await supabase.from('clients').insert([{
             first_name: data.first_name,
             last_name: data.last_name,
             phone: data.phone
         }]).select().single();
         
         if (error) throw error;
         clientId = newClient.id;
         onClientUpdated();
      }

      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (editingId) {
        // Edit mode supports only one record (legacy constraint or UI constraint)
        // If we wanted to "edit" a bulk insertion, it's 3 separate rows.
        // We only allow editing one ROW at a time from history.
        const service = selectedServices[0];
        await updateAppointment(editingId, {
          date: data.date,
          treatment: service.treatment,
          price: service.price,
        });
        alert('Trattamento aggiornato!');
        setEditingId(null);
      } else {
        // Bulk Insert
        const promises = selectedServices.map(service => 
          addAppointment({
            client_id: clientId!,
            date: data.date,
            start_time: timeString,
            treatment: service.treatment,
            price: service.price,
          })
        );
        await Promise.all(promises);
        alert(`${selectedServices.length} trattamenti registrati!`);
      }

      if (selectedClient || clientId) fetchHistory(selectedClient?.id || clientId!);
      
      if (!editingId) {
        setSelectedServices([]);
        setCurrentTreatment('');
        setCurrentPrice('');
      } else {
        cancelEdit(); 
      }
      
    } catch (err) {
      console.error(err);
      alert('Errore nel salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = selectedServices.reduce((sum, item) => sum + item.price, 0);

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
                Nuova Registrazione (Cassa)
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
            
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Registrazione</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  {...register('date', { required: true })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Services Builder */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
               {editingId ? 'Modifica Servizio' : 'Carrello Servizi'}
            </h3>
            
            {/* Add Service Input Group */}
            {!editingId && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                 <div className="grid grid-cols-[1fr,100px] gap-2">
                    <select
                      value={currentTreatment}
                      onChange={handleTreatmentSelect}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                       <option value="">Aggiungi servizio...</option>
                       {TREATMENTS.map(t => (
                         <option key={t} value={t}>{t}</option>
                       ))}
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                        placeholder="€ 0.00"
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                 </div>
                 <button 
                   type="button" 
                   onClick={addService}
                   disabled={!currentTreatment || !currentPrice}
                   className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Plus size={16} /> Aggiungi
                 </button>
              </div>
            )}

            {/* Selected Services List */}
            <div className="bg-white border boundary-slate-200 rounded-lg overflow-hidden">
               {selectedServices.length > 0 ? (
                 <ul className="divide-y divide-slate-100">
                    {selectedServices.map((item, idx) => (
                      <li key={idx} className="p-3 flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{idx+1}</span>
                            <span className="font-medium text-slate-700">{item.treatment}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">€ {item.price.toFixed(2)}</span>
                            {!editingId && (
                              <button type="button" onClick={() => removeService(idx)} className="text-slate-400 hover:text-red-500">
                                <X size={16} />
                              </button>
                            )}
                         </div>
                      </li>
                    ))}
                 </ul>
               ) : (
                 <div className="p-6 text-center text-slate-400 text-sm italic">
                   Nessun servizio selezionato
                 </div>
               )}
               {selectedServices.length > 0 && (
                 <div className="bg-slate-50 p-3 flex justify-between items-center font-bold text-slate-800 border-t border-slate-200">
                    <span>Totale</span>
                    <span>€ {totalAmount.toFixed(2)}</span>
                 </div>
               )}
            </div>
            
            {editingId && (
               <div className="bg-amber-50 p-3 rounded text-amber-800 text-xs">
                 In modifica puoi cambiare solo i dettagli dell'elemento selezionato.
                 <div className="mt-2">
                    <label className="block font-medium mb-1">Prezzo Modificato</label>
                    <input 
                       type="number" 
                       value={selectedServices[0]?.price || 0}
                       onChange={(e) => setSelectedServices([{ ...selectedServices[0], price: Number(e.target.value) }])}
                       className="w-full p-2 border border-amber-300 rounded"
                    />
                 </div>
               </div>
            )}
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
            disabled={submitting || selectedServices.length === 0}
            className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-md ${
              editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-70`}
          >
            <ShoppingBag size={18} />
            {submitting ? 'Salvataggio...' : (editingId ? 'Aggiorna Entrata' : 'Registra Incasso')}
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
                       <td className="px-6 py-4 text-right font-semibold">€ {(item.price || 0).toFixed(2)}</td>
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
