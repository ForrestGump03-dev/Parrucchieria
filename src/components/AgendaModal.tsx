import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Clock, UserPlus, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client, type Appointment } from '../types';
import ClientList from './ClientList';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { TREATMENTS } from '../constants/treatments';

 interface AgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  appointmentToEdit?: Appointment | null;
  onSaved: () => void;
}

interface ExternalFormData {
  start_time: string;
}

interface NewClientFormData {
  first_name: string;
  last_name: string;
  phone: string;
}

interface ServiceItem {
  id?: string;
  treatment: string;
}

export default function AgendaModal({ isOpen, onClose, initialDate, appointmentToEdit, onSaved }: AgendaModalProps) {
  const { clients, addClient, fetchClients, getClientByPhone } = useClients(); 
  const { addAppointment, updateAppointment, getClientAppointmentsByTime, deleteAppointment } = useAppointments();
  
  const [step, setStep] = useState<'client' | 'details' | 'new-client'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { register, handleSubmit, setValue, reset } = useForm<ExternalFormData>();
  const { register: registerNewClient, handleSubmit: handleSubmitNewClient, reset: resetNewClient } = useForm<NewClientFormData>();
  
  const [submitting, setSubmitting] = useState(false);

  // Multi-service state
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [currentTreatment, setCurrentTreatment] = useState('');

  // When opening
  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        // Edit mode
        setStep('details');
        if(appointmentToEdit.clients) setSelectedClient(appointmentToEdit.clients);
        
        setValue('start_time', appointmentToEdit.start_time.slice(0, 5)); // HH:mm
        
        // OLD: Load single existing service
        // setSelectedServices([{ treatment: appointmentToEdit.treatment }]);

        // NEW: Load all siblings
        getClientAppointmentsByTime(appointmentToEdit.client_id, appointmentToEdit.date, appointmentToEdit.start_time)
          .then(siblings => {
              if (siblings && siblings.length > 0) {
                 const mapped = siblings.map(s => ({ id: s.id, treatment: s.treatment }));
                 setSelectedServices(mapped);
              } else {
                 // Fallback if query fails but we have the prop
                 setSelectedServices([{ id: appointmentToEdit.id, treatment: appointmentToEdit.treatment }]);
              }
          });

      } else {
        // Create mode
        setStep('client');
        setSelectedClient(null);
        reset();
        resetNewClient();
        setSelectedServices([]);
        if (initialDate) {
          const hours = initialDate.getHours().toString().padStart(2, '0');
          const minutes = initialDate.getMinutes().toString().padStart(2, '0');
          setValue('start_time', `${hours}:${minutes}`);
        }
      }
    }
  }, [isOpen, initialDate, appointmentToEdit, setValue, reset, resetNewClient]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep('details');
  };

  const addService = () => {
    if (!currentTreatment) return;
    setSelectedServices([...selectedServices, { treatment: currentTreatment }]);
    setCurrentTreatment('');
  };

  const removeService = (index: number) => {
    const newServices = [...selectedServices];
    newServices.splice(index, 1);
    setSelectedServices(newServices);
  };

  const onNewClientSubmit = async (data: NewClientFormData) => {
    setSubmitting(true);
    try {
      // Check for duplicate
      const existing = await getClientByPhone(data.phone);
      if (existing) {
        toast.error(`Cliente già esistente: ${existing.first_name} ${existing.last_name}`);
        const userWantsToUseExisting = confirm(`Il numero ${data.phone} è già associato a ${existing.first_name} ${existing.last_name}. Vuoi usare questo cliente esistente?`);
        if (userWantsToUseExisting) {
           setSelectedClient(existing);
           setStep('details');
           setSubmitting(false);
           return;
        }
        // If they assume logic is wrong, they might proceed creating duplicate.
      }

      const newClient = await addClient({
        ...data,
      });
      setSelectedClient(newClient);
      setStep('details');
    } catch (e) {
      console.error(e);
      toast.error('Errore creazione cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: ExternalFormData) => {
    if (!selectedClient) return;
    if (selectedServices.length === 0) {
      toast.error('Seleziona almeno un trattamento');
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = (appointmentToEdit ? appointmentToEdit.date : initialDate?.toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
      
      if (appointmentToEdit) {
         // EDIT SESSION MODE
         // We have current `selectedServices` (some with ID, some new)
         // We should also know which IDs were removed, but simpler is:
         // 1. Get current IDs from DB (we did that on load) -> actually we don't store "original" list.
         // Let's rely on Diffing against what we loaded. 
         // Strategy: 
         // - Valid IDs in `selectedServices` -> UPDATE (set time/date/treatment)
         // - No ID in `selectedServices` -> INSERT
         // - IDs that exist in DB matching criteria but NOT in `selectedServices` -> DELETE
         // Problem: we didn't keep the original list to know what to delete.
         
         // Alternative Strategy: "Smart Sync" relies on fetch.
         // Let's refetch state from DB to compare.
         const remoteSiblings = await getClientAppointmentsByTime(appointmentToEdit.client_id, appointmentToEdit.date, appointmentToEdit.start_time);
         const currentIds = selectedServices.map(s => s.id).filter(Boolean);
         const dbIds = remoteSiblings.map(s => s.id);

         // 1. Delete removed
         const toDelete = dbIds.filter(id => !currentIds.includes(id));
         if (toDelete.length > 0) {
             await Promise.all(toDelete.map(id => deleteAppointment(id)));
         }

         // 2. Update existing & Insert new
         const upsertPromises = selectedServices.map(service => {
            if (service.id) {
                // Update
                return updateAppointment(service.id, {
                    client_id: selectedClient.id,
                    date: dateStr,
                    start_time: data.start_time,
                    treatment: service.treatment,
                    price: null
                });
            } else {
                // Insert
                return addAppointment({
                    client_id: selectedClient.id,
                    date: dateStr,
                    start_time: data.start_time,
                    treatment: service.treatment,
                    price: null, 
                });
            }
         });
         await Promise.all(upsertPromises);
         
         toast.success("Appuntamento aggiornato!");
      } else {
        // Bulk Create
        const promises = selectedServices.map(service => 
          addAppointment({
            client_id: selectedClient.id,
            date: dateStr,
            start_time: data.start_time,
            treatment: service.treatment,
            price: null, // Always null for agenda bookings
          })
        );
        await Promise.all(promises);
      }
      
      onSaved();
      onClose();
      toast.success("Appuntamento salvato!");
    } catch (e) {
      console.error(e);
      toast.error('Errore salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {step !== 'client' && (
              <button onClick={() => setStep('client')} className="hover:text-slate-300">
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="font-semibold text-lg">
              {step === 'client' ? 'Seleziona Cliente' : 
               step === 'new-client' ? 'Nuovo Cliente' : 'Dettagli Appuntamento'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
           {step === 'client' ? (
             <div className="h-full flex flex-col">
               <div className="mb-4">
                 <button
                   onClick={() => setStep('new-client')}
                   className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2 font-medium"
                 >
                   <UserPlus size={20} />
                   Crea Nuovo Cliente
                 </button>
               </div>
               <div className="flex-1 overflow-hidden">
                 <ClientList 
                   clients={clients} 
                   onSelect={handleClientSelect} 
                   loading={false}
                   onClientDeleted={fetchClients}
                 />
               </div>
             </div>
           ) : step === 'new-client' ? (
             <form onSubmit={handleSubmitNewClient(onNewClientSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                    <input
                      {...registerNewClient('first_name', { required: true })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cognome *</label>
                    <input
                      {...registerNewClient('last_name', { required: true })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefono *</label>
                  <input
                    {...registerNewClient('phone', { required: true })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {submitting ? 'Creazione...' : 'Crea e Seleziona'}
                  </button>
                </div>
             </form>
           ) : (
             <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Client Summary */}
                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-sm text-slate-500">Cliente Selezionato</div>
                    <div className="font-semibold text-slate-800">{selectedClient?.first_name} {selectedClient?.last_name}</div>
                  </div>
                  <button type="button" onClick={() => setStep('client')} className="text-sm text-indigo-600 hover:underline">
                    Cambia
                  </button>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Orario Inizio</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="time"
                      {...register('start_time', { required: true })}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                {/* Services Builder */}
                <div className="space-y-4">
                   <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Servizi Richiesti</h3>
                   
                   <div className="flex gap-2">
                        <select
                           value={currentTreatment}
                           onChange={(e) => {
                              const val = e.target.value;
                              /* REMOVED legacy edit restriction logic
                              if (appointmentToEdit && selectedServices.length > 0) {
                                  // In edit mode we replace directly because we only support editing one at a time for now
                                  setSelectedServices([{ treatment: val }]);
                                  setCurrentTreatment('');
                              } else {
                              */
                                  setCurrentTreatment(val);
                              //}
                           }}
                           className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                           <option value="">{/* appointmentToEdit ? 'Modifica Servizio...' : */ 'Seleziona servizio...'}</option>
                           {TREATMENTS.map(t => (
                             <option key={t} value={t}>{t}</option>
                           ))}
                        </select>
                        {/* Always show Add button now that we support multi-edit */
                        // !appointmentToEdit && (
                            <button 
                            type="button" 
                            onClick={addService}
                            disabled={!currentTreatment}
                            className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                            <Plus size={20} />
                            </button>
                        // )
                        }
                   </div>

                   <div className="bg-white border boundary-slate-200 rounded-lg overflow-hidden">
                       {selectedServices.length > 0 ? (
                         <ul className="divide-y divide-slate-100">
                            {selectedServices.map((item, idx) => (
                              <li key={idx} className="p-3 flex justify-between items-center text-sm">
                                 <span className="font-medium text-slate-700">{item.treatment}</span>
                                 {/* !appointmentToEdit && */ (
                                   <button type="button" onClick={() => removeService(idx)} className="text-slate-400 hover:text-red-500">
                                     <Trash2 size={16} />
                                   </button>
                                 )}
                              </li>
                            ))}
                         </ul>
                       ) : (
                         <div className="p-6 text-center text-slate-400 text-sm italic">
                           Nessun servizio aggiunto per questo appuntamento.
                         </div>
                       )}
                   </div>
                   {appointmentToEdit && (
                     <p className="text-xs text-slate-500 mt-2">
                        Puoi aggiungere nuovi trattamenti o rimuovere quelli esistenti.
                     </p>
                   )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submitting || selectedServices.length === 0}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    <Save size={18} />
                    {submitting ? 'Salvataggio...' : 'Conferma Appuntamento'}
                  </button>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
}