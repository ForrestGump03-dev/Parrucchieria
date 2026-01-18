import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Clock, Scissors, /* Euro, */ UserPlus, ArrowLeft } from 'lucide-react';
import { type Client, type Appointment } from '../types';
import ClientList from './ClientList';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';

interface AgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  appointmentToEdit?: Appointment | null;
  onSaved: () => void;
}

interface ExternalFormData {
  treatment: string;
  price?: number;
  start_time: string;
}

interface NewClientFormData {
  first_name: string;
  last_name: string;
  phone: string;
}

export default function AgendaModal({ isOpen, onClose, initialDate, appointmentToEdit, onSaved }: AgendaModalProps) {
  const { clients, addClient, fetchClients } = useClients(); // For the search list
  const { addAppointment, updateAppointment, getLastPriceForTreatment } = useAppointments();
  
  const [step, setStep] = useState<'client' | 'details' | 'new-client'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<ExternalFormData>();
  const { register: registerNewClient, handleSubmit: handleSubmitNewClient, reset: resetNewClient } = useForm<NewClientFormData>();
  
  const [submitting, setSubmitting] = useState(false);

  // When opening
  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        // Edit mode
        setStep('details');
        if(appointmentToEdit.clients) setSelectedClient(appointmentToEdit.clients);
        
        setValue('treatment', appointmentToEdit.treatment);
        setValue('price', appointmentToEdit.price || 0); // Handle null price
        setValue('start_time', appointmentToEdit.start_time.slice(0, 5)); // HH:mm
      } else {
        // Create mode
        setStep('client');
        setSelectedClient(null);
        reset();
        resetNewClient();
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

  /*
  const treatmentValue = watch('treatment');
  const handleTreatmentBlur = async () => {
     if (treatmentValue) {
       const price = await getLastPriceForTreatment(treatmentValue);
       if (price !== null) setValue('price', price);
     }
  };
  */

  // Remove handleTreatmentBlur call from onBlur if we don't want to auto-fill hidden price
  // But user said "remove the request of price", not "don't save it if known".
  // Actually, if input is gone, setValue 'price' works but user can't see/edit it.
  // Best to just not set it for Agenda.
  // const handleTreatmentBlurMock = () => {}; // No-op

  const onNewClientSubmit = async (data: NewClientFormData) => {
    setSubmitting(true);
    try {
      const newClient = await addClient({
        ...data,
      });
      // Refresh list not strictly needed if addClient updates local state, but safe
      // await fetchClients(); 
      setSelectedClient(newClient);
      setStep('details');
    } catch (e) {
      console.error(e);
      alert('Errore creazione cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: ExternalFormData) => {
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      const appointmentData = {
        client_id: selectedClient.id,
        date: (appointmentToEdit ? appointmentToEdit.date : initialDate?.toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
        start_time: data.start_time,
        treatment: data.treatment,
        price: data.price ? Number(data.price) : 0, // Default to 0 instead of null to match DB schema
      };

      if (appointmentToEdit) {
        await updateAppointment(appointmentToEdit.id, appointmentData);
      } else {
        if(!initialDate) return;
        await addAppointment(appointmentData);
      }
      
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Errore salvataggio');
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
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={18} />
                    {submitting ? 'Salvataggio...' : 'Crea e Seleziona'}
                  </button>
                </div>
             </form>
           ) : (

             <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-lg flex items-center gap-3">
                   <div className="bg-indigo-100 p-2 rounded-full text-indigo-700 font-bold">
                     {selectedClient?.first_name.charAt(0)}{selectedClient?.last_name.charAt(0)}
                   </div>
                   <div>
                     <p className="font-medium text-indigo-900">{selectedClient?.first_name} {selectedClient?.last_name}</p>
                     <p className="text-sm text-indigo-600">{selectedClient?.phone}</p>
                   </div>
                   <button 
                     type="button" 
                     onClick={() => setStep('client')}
                     className="ml-auto text-xs underline text-indigo-600 hover:text-indigo-800"
                   >
                     Cambia
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Orario Inizio</label>
                     <div className="relative">
                       <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="time" 
                         {...register('start_time', { required: true })}
                         className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg"
                       />
                     </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Trattamento</label>
                   <div className="relative">
                     <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                     <input 
                       {...register('treatment', { required: true })}
                       // onBlur={handleTreatmentBlur} // Disabled auto-price fetch for Agenda
                       placeholder="Es. Colore e Piega"
                       className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg"
                     />
                   </div>
                </div>

                 {/* Price field removed as requested */}
                
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setStep('client')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Indietro
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Save size={18} /> Salva Appuntamento
                  </button>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
}
