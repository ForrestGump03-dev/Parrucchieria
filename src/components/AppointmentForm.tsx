import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar, FileText, Phone, User, History as HistoryIcon, Pencil, Trash2, X, Plus, ShoppingBag, Check, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client, type Appointment } from '../types';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTreatments } from '../hooks/useTreatments';
import TreatmentManagerModal from './TreatmentManagerModal';
import ConfirmModal from './ConfirmModal';

interface AppointmentFormProps {
  selectedClient?: Client;
  onClientUpdated: () => void;
  onSelectExistingClient?: (client: Client | undefined) => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  date: string;
  notes?: string;
}

interface ServiceItem {
  treatment: string;
  price: number;
}

export default function AppointmentForm({ selectedClient, onClientUpdated, onSelectExistingClient }: AppointmentFormProps) {
  const { register, handleSubmit, setValue, reset, watch } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const { user } = useAuth();
  const { addAppointment, getLastPriceForTreatment, getClientHistory, deleteAppointment, updateAppointment } = useAppointments();
  const { getClientByPhone, updateClient } = useClients();
  const { treatments } = useTreatments();
  const [history, setHistory] = useState<Appointment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isTreatmentManagerOpen, setIsTreatmentManagerOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Watch phone for duplicate check
  const phoneValue = watch('phone');

  // Debounce duplicate check
  useEffect(() => {
    if (!selectedClient && phoneValue && phoneValue.length > 5) {
      const timer = setTimeout(async () => {
        const existing = await getClientByPhone(phoneValue);
        if (existing) {
          toast((t) => (
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Cliente trovato!</span>
              <span className="text-sm">Il numero {phoneValue} appartiene a {existing.first_name} {existing.last_name}.</span>
              <button 
                onClick={() => {
                   if(onSelectExistingClient) onSelectExistingClient(existing);
                   toast.dismiss(t.id);
                }}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
              >
                Carica Dati Cliente
              </button>
            </div>
          ), { duration: 6000, icon: '🔍' });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phoneValue, selectedClient, getClientByPhone, onSelectExistingClient]);

  // Multi-service state
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [currentTreatment, setCurrentTreatment] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>('');

  const handleTreatmentSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrentTreatment(val);
    if (val) {
      // Find default price from treatment list first
      const treatment = treatments.find(t => t.name === val);
      if (treatment?.price) {
          setCurrentPrice(treatment.price.toString());
      } else {
          // Fallback to history
          const price = await getLastPriceForTreatment(val);
          if (price !== null) {
            setCurrentPrice(price.toString());
          }
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

  const fetchHistory = useCallback(async (clientId: string) => {
    const data = await getClientHistory(clientId);
    setHistory(data || []);
  }, [getClientHistory]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSelectedServices([]);
    if (selectedClient) {
      setValue('date', format(new Date(), 'yyyy-MM-dd'));
    } else {
      reset();
    }
  }, [selectedClient, setValue, reset]);

  useEffect(() => {
    if (selectedClient) {
      if (!editingId) {
        setIsEditingClient(false);
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
  }, [selectedClient, setValue, editingId, fetchHistory, cancelEdit]); 

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setValue('date', apt.date);
    setSelectedServices([{ treatment: apt.treatment, price: apt.price || 0 }]);
    // Popola anche le note nello spazio del form in modo da poterle modificare
    setValue('notes', apt.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
  };

  const performDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteAppointment(itemToDelete);
      if (selectedClient) fetchHistory(selectedClient.id);
      toast.success("Trattamento eliminato");
    } catch {
      toast.error('Errore eliminazione');
    } finally {
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (selectedServices.length === 0) {
      toast.error('Seleziona almeno un trattamento');
      return;
    }
    setSubmitting(true);
    try {
      let clientId = selectedClient?.id;

      if (!clientId) {
         const existing = await getClientByPhone(data.phone);
         if (existing) {
             const confirmLoad = confirm(`Attenzione: Il numero ${data.phone} è già associato a ${existing.first_name} ${existing.last_name}. Vuoi usare questo cliente esistente invece di crearne uno nuovo?`);
             if (confirmLoad) {
                if(onSelectExistingClient) {
                    onSelectExistingClient(existing);
                    toast.success(`Dati di ${existing.first_name} caricati! Riprova il salvataggio.`);
                    setSubmitting(false);
                    return;
                }
             }
         }
         
         if (!user) {
             toast.error("Sessione scaduta. Ricarica la pagina.");
             setSubmitting(false);
             return;
         }

         const { data: newClient, error } = await supabase.from('clients').insert([{
             first_name: data.first_name,
             last_name: data.last_name,
             phone: data.phone,
             user_id: user.id
         }]).select().single();
         
         if (error) throw error;
         clientId = newClient.id;
         onClientUpdated();
      }

      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (editingId) {
        const service = selectedServices[0];
        await updateAppointment(editingId, {
          date: data.date,
          treatment: service.treatment,
          price: service.price,
          notes: data.notes,
        });
        toast.success('Trattamento aggiornato!');
        setEditingId(null);
      } else {
        const promises = selectedServices.map(service => 
          addAppointment({
            client_id: clientId!,
            date: data.date,
            start_time: timeString,
            treatment: service.treatment,
            price: service.price,
            notes: data.notes,
          })
        );
        await Promise.all(promises);
        toast.success(`${selectedServices.length} trattamenti registrati!`);
      }

      if (selectedClient || clientId) fetchHistory(selectedClient?.id || clientId!);
      
      if (!editingId) {
        setSelectedServices([]);
        setCurrentTreatment('');
        setCurrentPrice('');
        setValue('notes', '');
      } else {
        cancelEdit(); 
      }
      
    } catch (err: unknown) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      toast.error(`Errore nel salvataggio: ${e.message || e.error_description || 'Errore sconosciuto'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const saveClientChanges = async () => {
    if (!selectedClient) return;
    const currentValues = watch();

    if (!currentValues.first_name || !currentValues.last_name || !currentValues.phone) {
       toast.error("Tutti i campi sono obbligatori");
       return;
    }

    try {
      await updateClient(selectedClient.id, {
        first_name: currentValues.first_name,
        last_name: currentValues.last_name,
        phone: currentValues.phone
      });
      toast.success("Cliente aggiornato!");
      setIsEditingClient(false);
      onClientUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Errore aggiornamento cliente");
    }
  };

  const totalAmount = selectedServices.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-6">
      <TreatmentManagerModal isOpen={isTreatmentManagerOpen} onClose={() => setIsTreatmentManagerOpen(false)} />
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
                {selectedClient ? `Nuova Registrazione: ${selectedClient.first_name}` : 'Nuova Registrazione (Cassa)'}
              </>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {selectedClient && !editingId && (
              <button 
                type="button" 
                onClick={() => {
                  if(onSelectExistingClient) onSelectExistingClient(undefined);
                }} 
                className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-sm bg-slate-100 px-3 py-1 rounded-full transition-colors"
              >
                <X size={14} /> Deseleziona Cliente
              </button>
            )}
            {editingId && (
                <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm">
                <X size={16} /> Annulla Modifica
                </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dati Cliente</h3>
               {selectedClient && (
                  isEditingClient ? (
                    <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={saveClientChanges}
                         className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                       >
                         <Check size={14} /> Salva
                       </button>
                       <button 
                         type="button"
                         onClick={() => {
                            setIsEditingClient(false);
                            setValue('first_name', selectedClient.first_name);
                            setValue('last_name', selectedClient.last_name);
                            setValue('phone', selectedClient.phone);
                         }}
                         className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200"
                       >
                         <X size={14} /> Annulla
                       </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setIsEditingClient(true)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <Pencil size={14} /> Modifica
                    </button>
                  )
               )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    {...register('first_name', { required: true })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500"
                    placeholder="Nome"
                    readOnly={Boolean(selectedClient && !isEditingClient)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cognome</label>
                <input
                  {...register('last_name', { required: true })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500"
                  placeholder="Cognome"
                  readOnly={Boolean(selectedClient && !isEditingClient)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  {...register('phone', { 
                    required: true,
                    pattern: {
                      value: /^[0-9+]+$/,
                      message: "Solo numeri e '+' sono consentiti"
                    },
                    onChange: (e) => {
                       const clean = e.target.value.replace(/[^0-9+]/g, '');
                       setValue('phone', clean); 
                    }
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500"
                  placeholder="Numero di telefono"
                  readOnly={Boolean(selectedClient && !isEditingClient)}
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
              <div className="space-y-2">
                 <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Servizio</label>
                    <button 
                       type="button" 
                       onClick={() => setIsTreatmentManagerOpen(true)}
                       className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                       title="Gestisci Listino"
                    >
                        <Settings size={12} /> Impostazioni listino
                    </button>
                 </div>
                 <div className="grid grid-cols-[1fr,100px] gap-2">
                    <select
                      value={currentTreatment}
                      onChange={handleTreatmentSelect}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                       <option value="">Seleziona servizio...</option>
                       {treatments.map(t => (
                         <option key={t.id} value={t.name}>{t.name}</option>
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

          {/* Note Field (New) - mostrato anche in modifica per poter aggiornare le note */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (Opzionale)</label>
            <textarea
              {...register('notes')}
              placeholder="Appunti sul trattamento, formula colore, ecc..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
            />
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
                   <th className="px-6 py-3">Note</th>
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
                       <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={item.notes || ''}>{item.notes || '-'}</td>
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
                     <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
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
      
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Elimina Trattamento"
        message="Sei sicuro di voler eliminare questo trattamento dallo storico? Questa azione non può essere annullata."
        confirmText="Sì, elimina"
        cancelText="Annulla"
        isDanger={true}
        onConfirm={performDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
