import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Clock, UserPlus, ArrowLeft, Trash2, Settings, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client, type Appointment } from '../types';
import ClientList from './ClientList';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { useTreatments } from '../hooks/useTreatments';
import { useStaff } from '../hooks/useStaff';
import TreatmentManagerModal from './TreatmentManagerModal';
import StaffManagerModal from './StaffManagerModal';
import ConfirmModal from './ConfirmModal';
import { addMinutes, format } from 'date-fns';

interface AgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  initialStaffId?: string;
  appointmentToEdit?: Appointment | null;
  onSaved: () => void;
  onDeleteRequest?: (clientId: string, clientName: string) => void;
}

interface ExternalFormData {
  start_time: string;
  staff_id?: string;
}

interface NewClientFormData {
  first_name: string;
  last_name: string;
  phone: string;
}

interface ServiceItem {
  id?: string;
  treatment: string;
  duration: number;
  staffId?: string;
}

export default function AgendaModal({ isOpen, onClose, initialDate, initialStaffId, appointmentToEdit, onSaved, onDeleteRequest }: AgendaModalProps) {
  const { clients, addClient, fetchClients, getClientByPhone, findPotentialDuplicates } = useClients(); 
  const { addAppointment, updateAppointment, getClientAppointmentsByTime, deleteAppointment } = useAppointments();
  const { treatments } = useTreatments();
  const { staff } = useStaff();
  
  const [step, setStep] = useState<'client' | 'details' | 'new-client'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isTreatmentManagerOpen, setIsTreatmentManagerOpen] = useState(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  
  const { register, handleSubmit, setValue, reset, getValues } = useForm<ExternalFormData>();
  const { register: registerNewClient, handleSubmit: handleSubmitNewClient, reset: resetNewClient, setValue: setValueNewClient } = useForm<NewClientFormData>();
  
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setValue('staff_id', appointmentToEdit.staff_id || '');

        // NEW: Load all siblings
        getClientAppointmentsByTime(appointmentToEdit.client_id, appointmentToEdit.date, appointmentToEdit.start_time)
          .then(siblings => {
              if (siblings && siblings.length > 0) {
                 const mapped = siblings.map(s => ({ 
                   id: s.id, 
                   treatment: s.treatment,
                   duration: s.duration || 30, // Load duration
                   staffId: s.staff_id || undefined
                 }));
                 setSelectedServices(mapped);
              } else {
                 // Fallback if query fails but we have the prop
                 setSelectedServices([{ 
                   id: appointmentToEdit.id, 
                   treatment: appointmentToEdit.treatment,
                   duration: appointmentToEdit.duration || 30,
                   staffId: appointmentToEdit.staff_id || undefined
                  }]);
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
        
        // Auto-select staff based on column clicked
        setValue('staff_id', initialStaffId || '');
      }
    }
  }, [isOpen, initialDate, initialStaffId, appointmentToEdit, setValue, reset, resetNewClient, getClientAppointmentsByTime]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep('details');
  };

  const removeService = (index: number) => {
    const newServices = [...selectedServices];
    newServices.splice(index, 1);
    setSelectedServices(newServices);
  };
  
  const updateDuration = (index: number, newDuration: number) => {
    const newServices = [...selectedServices];
    newServices[index].duration = newDuration;
    setSelectedServices(newServices);
  };

  const updateServiceStaff = (index: number, newStaffId: string) => {
    const newServices = [...selectedServices];
    newServices[index].staffId = newStaffId || undefined;
    setSelectedServices(newServices);
  };

  const performDelete = async () => {
    if (!appointmentToEdit || !selectedClient) return;
    
    setShowDeleteConfirm(false);
    setSubmitting(true);
    try {
      // 1. Fetch all siblings from DB to be sure we get all IDs
      const siblings = await getClientAppointmentsByTime(
        appointmentToEdit.client_id, 
        appointmentToEdit.date, 
        appointmentToEdit.start_time
      );
      
      const idsToDelete = siblings.map(s => s.id);
      
      // 2. Delete all
      await Promise.all(idsToDelete.map(id => deleteAppointment(id)));
      
      toast.success('Appuntamento eliminato');
      onSaved();
      onClose();

      if (onDeleteRequest) {
          onDeleteRequest(selectedClient.id, `${selectedClient.first_name} ${selectedClient.last_name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setSubmitting(false);
    }
  };

  const onNewClientSubmit = async (data: NewClientFormData) => {
    setSubmitting(true);
    try {
      // 1. Strict Duplicate Check (Phone)
      if (data.phone && data.phone.length > 5) {
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
        }
      } else {
        // 2. Soft Duplicate Check (Name)
        const possibleDupes = await findPotentialDuplicates(data.first_name, data.last_name);
        if (possibleDupes.length > 0) {
           const match = possibleDupes[0];
           const useExisting = confirm(`Esiste già un cliente chiamato "${match.first_name} ${match.last_name}" (ma senza telefono o con telefono diverso). Vuoi usare quello esistente per evitare clonazioni?`);
           if (useExisting) {
              setSelectedClient(match);
              setStep('details');
              setSubmitting(false);
              return;
           }
        }
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

  // Helper for sequential time calc
  const addMinutesToTime = (timeStr: string, minutesToAdd: number) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    const newDate = addMinutes(date, minutesToAdd);
    return format(newDate, 'HH:mm');
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
      
      // Sequential time logic initialization
      let currentStartTime = data.start_time;

      if (appointmentToEdit) {
         // EDIT SESSION MODE
         const remoteSiblings = await getClientAppointmentsByTime(appointmentToEdit.client_id, appointmentToEdit.date, appointmentToEdit.start_time);
         const currentIds = selectedServices.map(s => s.id).filter(Boolean);
         const dbIds = remoteSiblings.map(s => s.id);

         // 1. Delete removed
         const toDelete = dbIds.filter(id => !currentIds.includes(id));
         if (toDelete.length > 0) {
             await Promise.all(toDelete.map(id => deleteAppointment(id)));
         }

         // 2. Update existing & Insert new
         for (let i = 0; i < selectedServices.length; i++) {
            const service = selectedServices[i];
            const duration = service.duration || 30;
            const thisSlotStart = currentStartTime;
            const targetStaff = service.staffId || data.staff_id || null;
            
            if (service.id) {
                await updateAppointment(service.id, {
                    client_id: selectedClient.id,
                    date: dateStr,
                    start_time: thisSlotStart,
                    treatment: service.treatment,
                    price: null,
                    staff_id: targetStaff,
                    duration: duration
                });
            } else {
                await addAppointment({
                    client_id: selectedClient.id,
                    date: dateStr,
                    start_time: thisSlotStart,
                    treatment: service.treatment,
                    price: null,
                    staff_id: targetStaff,
                    duration: duration
                });
            }
            
            // Advance time
            currentStartTime = addMinutesToTime(thisSlotStart, duration);
         }
         
         toast.success("Appuntamento aggiornato!");
      } else {
        // Bulk Create (Sequential)
        for (let i = 0; i < selectedServices.length; i++) {
           const service = selectedServices[i];
           const duration = service.duration || 30;
           const thisSlotStart = currentStartTime;
           const targetStaff = service.staffId || data.staff_id || null;
           
           await addAppointment({
            client_id: selectedClient.id,
            date: dateStr,
            start_time: thisSlotStart,
            treatment: service.treatment,
            price: null,
            staff_id: targetStaff,
            duration: duration
          });
          
          currentStartTime = addMinutesToTime(thisSlotStart, duration);
        }
      }
      
      onSaved();
      onClose();
      // toast.success("Appuntamento salvato!"); // handled inside if/else to be specific
    } catch (e) {
      console.error(e);
      toast.error('Errore salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
      if (!selectedClient?.phone) return;
      // Strip formatting, ensure 39
      let clean = selectedClient.phone.replace(/[^0-9]/g, '');
      if (!clean.startsWith('39')) clean = '39' + clean;
      
      const msg = `Ciao ${selectedClient.first_name}, ricordiamo il tuo appuntamento domani!`;
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <TreatmentManagerModal isOpen={isTreatmentManagerOpen} onClose={() => setIsTreatmentManagerOpen(false)} />
      <StaffManagerModal isOpen={isStaffManagerOpen} onClose={() => setIsStaffManagerOpen(false)} />
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefono (Opzionale)</label>
                  <input
                    {...registerNewClient('phone', { 
                      required: false,
                      pattern: {
                        value: /^[0-9+]*$/,
                        message: "Solo numeri e '+' sono consentiti"
                      },
                      onChange: (e) => {
                        const clean = e.target.value.replace(/[^0-9+]/g, '');
                        setValueNewClient('phone', clean); 
                      }
                    })}
                    placeholder="Se disponibile..."
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
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {selectedClient?.first_name} {selectedClient?.last_name}
                        {selectedClient?.phone && (
                            <button 
                                type="button" 
                                onClick={openWhatsApp}
                                className="text-green-600 hover:text-green-700 bg-green-50 p-1 rounded-full transition-colors"
                                title="Invia WhatsApp"
                            >
                                <MessageCircle size={16} />
                            </button>
                        )}
                    </div>
                  </div>
                  <button type="button" onClick={() => setStep('client')} className="text-sm text-indigo-600 hover:underline">
                    Cambia
                  </button>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">Parrucchiere</label>
                        <button type="button" onClick={() => setIsStaffManagerOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                           <Settings size={12} /> Gestione
                        </button>
                     </div>
                     <select 
                        {...register('staff_id', {
                          onChange: (e) => {
                             const newVal = e.target.value;
                             // Update all items to new global staff
                             setSelectedServices(prev => prev.map(s => ({ ...s, staffId: newVal || undefined })));
                          }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                     >                        <option value="">-- Chiunque --</option>
                        {staff.map(s => (
                           <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                     </select>
                  </div>
                </div>

                {/* Services Builder */}
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                       <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Servizi Richiesti</h3>
                       <button 
                         type="button" 
                         onClick={() => setIsTreatmentManagerOpen(true)}
                         className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                         title="Gestisci Listino"
                       >
                         <Settings size={12} /> Impostazioni listino
                       </button>
                   </div>
                   
                   <div className="flex gap-2">
                        <select
                           value={currentTreatment}
                           onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                  // Auto-add logic
                                  // Default duration 30 unless found in treatments list
                                  const tObj = treatments.find(t => t.name === val);
                                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                  // @ts-ignore
                                  const duration = tObj?.duration || 30;
                                  
                                  // Default staffId from global select
                                  const globalStaffId = getValues('staff_id');

                                  setSelectedServices(prev => [...prev, { treatment: val, duration, staffId: globalStaffId || undefined }]);
                                  setCurrentTreatment(''); // Reset immediately
                              }
                           }}
                           className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                           <option value="">Seleziona servizio per aggiungere...</option>
                           {treatments.map(t => (
                             <option key={t.id} value={t.name}>{t.name}</option>
                           ))}
                        </select>
                   </div>

                   <div className="bg-white border boundary-slate-200 rounded-lg overflow-hidden">
                       {selectedServices.length > 0 ? (
                         <ul className="divide-y divide-slate-100">
                            {selectedServices.map((item, idx) => (
                              <li key={idx} className="p-3 flex items-center gap-3 text-sm flex-wrap">
                                 <div className="font-medium text-slate-700 w-full md:w-auto md:flex-1">{item.treatment}</div>
                                 
                                 <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1">
                                       <select 
                                         value={item.staffId || ''} 
                                         onChange={(e) => updateServiceStaff(idx, e.target.value)}
                                         className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 max-w-[100px] truncate"
                                         title="Assegna operatore specifico"
                                       >
                                          <option value="">-- Chiunque --</option>
                                          {staff.map(s => (
                                             <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                       </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                       <select 
                                           value={item.duration || 30} 
                                           onChange={(e) => updateDuration(idx, Number(e.target.value))}
                                           className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50"
                                       >
                                           {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180].map(m => (
                                               <option key={m} value={m}>{m}m</option>
                                           ))}
                                       </select>
                                    </div>

                                    <button type="button" onClick={() => removeService(idx)} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                 </div>
                              </li>
                            ))}
                         </ul>
                       ) : (
                         <div className="p-6 text-center text-slate-400 text-sm italic">
                           Nessun servizio aggiunto. Seleziona dal menu sopra.
                         </div>
                       )}
                   </div>

                   {/* Summary of total duration */ }
                   {selectedServices.length > 0 && (
                      <div className="text-right text-xs text-slate-500">
                         Totale stimato: {selectedServices.reduce((acc, curr) => acc + (curr.duration || 30), 0)} min
                      </div>
                   )}
                   {appointmentToEdit && (
                     <p className="text-xs text-slate-500 mt-2">
                        Puoi aggiungere nuovi trattamenti o rimuovere quelli esistenti.
                     </p>
                   )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  {appointmentToEdit && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={submitting}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mr-auto"
                    >
                      <Trash2 size={18} />
                      Elimina
                    </button>
                  )}
                  
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
      
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Elimina Appuntamento"
        message="Sei sicuro di voler eliminare questo appuntamento e tutti i trattamenti collegati? Questa azione non può essere annullata."
        confirmText="Sì, elimina tutto"
        cancelText="Annulla"
        isDanger={true}
        onConfirm={performDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
