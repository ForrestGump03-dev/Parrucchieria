import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, FileText, Phone, User, Pencil, Trash2, X, Plus, ShoppingBag, Check, Settings, Package, ChevronDown, ChevronRight, StickyNote, MessageCircle, Star, Mail, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Client, type Appointment, type ProductSold } from '../types';
import { useClients } from '../hooks/useClients';
import { useAppointments } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTreatments } from '../hooks/useTreatments';
import { useProducts } from '../hooks/useProducts';
import TreatmentManagerModal from './TreatmentManagerModal';
import ConfirmModal from './ConfirmModal';

interface AppointmentFormProps {
  selectedClient?: Client;
  onClientUpdated: () => void;
  onSelectExistingClient?: (client: Client | undefined) => void;
}

interface ProductItem {
    id: string;
    product: { id: string; name: string; price: number };
    quantity: number;
}

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  date: string;
  notes?: string;
  staff_id?: string;
}

interface ServiceItem {
  treatment: string;
  price: number;
  duration: number;
}

export default function AppointmentForm({ selectedClient, onClientUpdated, onSelectExistingClient }: AppointmentFormProps) {
  const { register, handleSubmit, setValue, reset, watch, getValues } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const { user } = useAuth();
  const { addAppointment, getLastPriceForTreatment, getClientHistory, deleteAppointment, updateAppointment } = useAppointments();
  const { getClientByPhone, updateClient, findPotentialDuplicates } = useClients();
  const { treatments } = useTreatments();
  const { products, decrementStock } = useProducts();
  
  const [history, setHistory] = useState<Appointment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isTreatmentManagerOpen, setIsTreatmentManagerOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    isOpen: boolean;
    message: string;
    existingClient: Client | null;
    pendingFormData: FormData | null;
  }>({ isOpen: false, message: '', existingClient: null, pendingFormData: null });
  
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
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [currentTreatment, setCurrentTreatment] = useState('');
  const [currentProduct, setCurrentProduct] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [currentDuration, setCurrentDuration] = useState<string>('30');

  const handleTreatmentSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrentTreatment(val);
    if (val) {
      // 1. Priorità allo storico: Cerchiamo l'ultimo prezzo usato per questo trattamento
      const lastPrice = await getLastPriceForTreatment(val);
      
      // 2. Cerchiamo i dettagli standard (per la durata)
      const treatment = treatments.find(t => t.name === val);

      if (lastPrice !== null) {
          // Se esiste uno storico, usiamo quel prezzo
          setCurrentPrice(lastPrice.toString());
          
          // Manteniamo la durata standard se disponibile, altrimenti 30
          if (treatment && treatment.duration) {
             setCurrentDuration(treatment.duration.toString());
          } else {
             setCurrentDuration('30');
          }
      } else if (treatment) {
          // Fallback standard se non c'è storico
          if (treatment.price) setCurrentPrice(treatment.price.toString());
          if (treatment.duration) setCurrentDuration(treatment.duration.toString());
      } else {
          // Nessuna info trovata
          setCurrentPrice('');
          setCurrentDuration('30');
      }
    } else {
      setCurrentPrice('');
      setCurrentDuration('30');
    }
  };

  const addService = () => {
    if (!currentTreatment || !currentPrice) return;
    setSelectedServices([...selectedServices, { 
      treatment: currentTreatment, 
      price: Number(currentPrice),
      duration: Number(currentDuration) || 30
    }]);
    setCurrentTreatment('');
    setCurrentPrice('');
    // Keep duration for convenience or reset? Reset to 30.
    setCurrentDuration('30');
  };

  const removeService = (index: number) => {
    const newServices = [...selectedServices];
    newServices.splice(index, 1);
    setSelectedServices(newServices);
  };

  const fetchHistory = useCallback(async (clientId: string) => {
    const data = await getClientHistory(clientId);
    setHistory(data || []);
    if (data && data.length > 0) {
        setExpandedDates(new Set([data[0].date]));
    }
  }, [getClientHistory]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSelectedServices([]);
    setSelectedProducts([]);
    if (selectedClient) {
      setValue('first_name', selectedClient.first_name);
      setValue('last_name', selectedClient.last_name);
      setValue('phone', selectedClient.phone);
      setValue('email', selectedClient.email || '');
      setValue('birth_date', selectedClient.birth_date || '');
      setValue('date', format(new Date(), 'yyyy-MM-dd'));
      setValue('notes', '');
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
        setValue('email', selectedClient.email || '');
        setValue('birth_date', selectedClient.birth_date || '');
        setValue('date', format(new Date(), 'yyyy-MM-dd'));
        // Load staff from last appointment? No, simplified.
        setSelectedServices([]);
        setSelectedProducts([]);
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setValue('staff_id', apt.staff_id || '');
    
    setSelectedServices([{ 
      treatment: apt.treatment, 
      price: apt.price || 0, 
      duration: apt.duration || 30 
    }]);
    
    // Load products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sold = (apt.products_sold as any[]) || [];
    const mapped = sold.map(p => {
        const found = products.find(prod => prod.id === p.id);
        return {
            id: p.id,
            product: found || { id: p.id, name: p.name, price: p.price },
            quantity: p.quantity || 1
        };
    });
    setSelectedProducts(mapped);

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
         // 1. Strict Phone Check
         if (data.phone && data.phone.length > 5) {
             const existing = await getClientByPhone(data.phone);
             if (existing) {
                 setDuplicateConfirm({
                   isOpen: true,
                   message: `Il numero ${data.phone} è già associato a ${existing.first_name} ${existing.last_name}. Vuoi usare questo cliente esistente invece di crearne uno nuovo?`,
                   existingClient: existing,
                   pendingFormData: data
                 });
                 setSubmitting(false);
                 return;
             }
         } else {
             // 2. Soft Name Check
             const possibleDupes = await findPotentialDuplicates(data.first_name, data.last_name);
             if (possibleDupes.length > 0) {
                const match = possibleDupes[0];
                setDuplicateConfirm({
                  isOpen: true,
                  message: `Esiste già un cliente chiamato "${match.first_name} ${match.last_name}" (ma senza telefono o con telefono diverso). Vuoi usare quello esistente per evitare clonazioni?`,
                  existingClient: match,
                  pendingFormData: data
                });
                setSubmitting(false);
                return;
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
             phone: data.phone || '', // Check valid value
             email: data.email || null,
             birth_date: data.birth_date || null,
             user_id: user.id
         }]).select().single();
         
         if (error) throw error;
         clientId = newClient.id;
         onClientUpdated();
      }
      
      // Prepare products payload
      const productsPayload = selectedProducts.map(p => ({
          id: p.product.id,
          name: p.product.name,
          price: p.product.price,
          quantity: p.quantity
      }));
      
      // Decrement logic only for new entries
      if (!editingId && productsPayload.length > 0) {
          for (const item of selectedProducts) {
             await decrementStock(item.product.id, item.quantity);
          }
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
          products_sold: productsPayload
        });
        toast.success('Trattamento aggiornato!');
        setEditingId(null);
      } else {
        const promises = selectedServices.map((service, index) => 
          addAppointment({
            client_id: clientId!,
            date: data.date,
            start_time: timeString,
            treatment: service.treatment,
            price: service.price,
            notes: data.notes,
            products_sold: (index === 0) ? productsPayload : [],
          })
        );
        await Promise.all(promises);
        toast.success(`${selectedServices.length} trattamenti registrati!`);
      }

      if (selectedClient || clientId) fetchHistory(selectedClient?.id || clientId!);
      
      if (!editingId) {
        setSelectedServices([]);
        setSelectedProducts([]);
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
    const currentValues = getValues();

    if (!currentValues.first_name || !currentValues.last_name) {
       toast.error("Nome e cognome sono obbligatori");
       return;
    }

    try {
      await updateClient(selectedClient.id, {
        first_name: currentValues.first_name,
        last_name: currentValues.last_name,
        phone: currentValues.phone,
        email: currentValues.email || null,
        birth_date: currentValues.birth_date || null
      });
      toast.success("Cliente aggiornato!");
      setIsEditingClient(false);
      onClientUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Errore aggiornamento cliente");
    }
  };

  const totalAmount = selectedServices.reduce((sum, item) => sum + item.price, 0)
    + selectedProducts.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Group History Logic
  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
        const next = new Set(prev);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        return next;
    });
  };

  const groupedHistory = useMemo(() => {
    const groups: Record<string, {
      date: string;
      items: Appointment[];
      totalPrice: number;
      productCount: number;
      treatments: Set<string>;
      notes: Set<string>;
    }> = {};

    history.forEach(apt => {
        const dateKey = apt.date; // YYYY-MM-DD
        if (!groups[dateKey]) {
            groups[dateKey] = {
                date: apt.date,
                items: [],
                totalPrice: 0,
                productCount: 0,
                treatments: new Set(),
                notes: new Set()
            };
        }
        
        const g = groups[dateKey];
        g.items.push(apt);
        g.treatments.add(apt.treatment);
        if (apt.notes) g.notes.add(apt.notes);
        
        const itemPrice = apt.price || 0;
        const sold: ProductSold[] = apt.products_sold ?? [];
        let productsTotal = 0;

        sold.forEach((p) => {
           const qty = p.quantity || 1;
           productsTotal += (Number(p.price) * qty);
           g.productCount += qty;
        });

        g.totalPrice += (itemPrice + productsTotal);
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  const sendWhatsApp = (type: 'reminder' | 'review' | 'promo') => {
      if (!selectedClient || !selectedClient.phone) return;
      const cleanPhone = selectedClient.phone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 5) return;
      
      let msg = '';
      if (type === 'reminder') {
          msg = `Ciao ${selectedClient.first_name}, ti ricordiamo che ti aspettiamo presto nel nostro salone! A presto!`;
      } else if (type === 'review') {
          msg = `Ciao ${selectedClient.first_name}! Speriamo tu ti sia trovat${selectedClient.first_name.endsWith('a') ? 'a' : 'o'} bene oggi. Ci faresti un enorme favore lasciandoci una recensione su Google? [INSERISCI LINK QUI] Grazie di cuore!`;
      } else if (type === 'promo') {
          msg = `Ciao ${selectedClient.first_name}! Abbiamo una novità esclusiva per te in salone. Passa a trovarci o prenota il tuo prossimo appuntamento!`;
      }
      
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

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
                            setValue('email', selectedClient.email || '');
                            setValue('birth_date', selectedClient.birth_date || '');
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
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white read-only:bg-slate-50 read-only:text-slate-500"
                    placeholder="Nome"
                    readOnly={Boolean(selectedClient && !isEditingClient)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cognome</label>
                <input
                  {...register('last_name', { required: true })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white read-only:bg-slate-50 read-only:text-slate-500"
                  placeholder="Cognome"
                  readOnly={Boolean(selectedClient && !isEditingClient)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono (Opzionale)</label>
                <div className="relative mt-auto">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    {...register('phone', { 
                      required: false,
                      pattern: {
                        value: /^[0-9+]*$/,
                        message: "Solo numeri e '+' sono consentiti"
                      },
                      onChange: (e) => {
                         const clean = e.target.value.replace(/[^0-9+]/g, '');
                         setValue('phone', clean); 
                      }
                    })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500"
                    placeholder="Se disponibile..."
                    readOnly={Boolean(selectedClient && !isEditingClient)}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opzionale)</label>
                <div className="relative mt-auto">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500"
                    placeholder="mario@example.com"
                    readOnly={Boolean(selectedClient && !isEditingClient)}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nascita (Opzionale)</label>
                <div className="relative mt-auto">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    {...register('birth_date')}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm read-only:bg-slate-50 read-only:text-slate-500 text-slate-700"
                    readOnly={Boolean(selectedClient && !isEditingClient)}
                  />
                </div>
              </div>
            </div>
            
            {/* WhatsApp Quick Actions */}
            {selectedClient && selectedClient.phone && selectedClient.phone.replace(/[^0-9+]/g, '').length >= 5 && !isEditingClient && !editingId && (
              <div className="md:col-span-2 pt-3 border-t border-slate-100 mt-1">
                 <h4 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2.5">
                    <MessageCircle size={13} className="text-emerald-500" /> Azioni Rapide WhatsApp
                 </h4>
                 <div className="flex flex-wrap gap-2">
                    <button 
                      type="button"
                      onClick={() => sendWhatsApp('reminder')}
                      className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                       <Calendar size={13} />
                       Promemoria
                    </button>
                    <button 
                      type="button"
                      onClick={() => sendWhatsApp('review')}
                      className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                       <Star size={13} />
                       Richiedi Recensione
                    </button>
                    <button 
                      type="button"
                      onClick={() => sendWhatsApp('promo')}
                      className="text-xs font-semibold bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 border border-fuchsia-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                       <Package size={13} />
                       Invia Promo
                    </button>
                 </div>
              </div>
            )}
            
             <div className="md:col-span-2 pt-2 border-t border-slate-100">
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

          {/* Products Section */}
          <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Package size={14} /> Prodotti & Rivendita
                  </h3>
              </div>
              
              {!editingId && (
              <div className="flex gap-2 mb-2">
                    <select
                      value={currentProduct}
                      onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                              const pObj = products.find(p => p.id === val);
                              if (pObj) {
                                  // Add or increment
                                  setSelectedProducts(prev => {
                                      const exists = prev.find(item => item.product.id === val);
                                      if (exists) {
                                          return prev.map(item => item.product.id === val ? { ...item, quantity: item.quantity + 1 } : item);
                                      }
                                      return [...prev, { id: val, product: pObj, quantity: 1 }];
                                  });
                              }
                              setCurrentProduct('');
                          }
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Aggiungi prodotto al conto...</option>
                      {products.filter(p => p.stock > 0).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (€ {p.price})</option>
                      ))}
                    </select>
              </div>
              )}
              
              {selectedProducts.length > 0 && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 space-y-2">
                      {selectedProducts.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700">{item.product.name}</span>
                                  <span className="text-slate-400 text-xs">x{item.quantity}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="font-semibold text-slate-700">€ {(item.product.price * item.quantity).toFixed(2)}</span>
                                  {!editingId && (
                                  <button 
                                    type="button" 
                                    onClick={() => setSelectedProducts(prev => prev.filter(p => p.id !== item.id))}
                                    className="text-slate-400 hover:text-red-500"
                                  >
                                      <X size={14} />
                                  </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          
          {/* Unified Total Section */}
           <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200 shadow-sm mt-2"> 
               <div className="flex flex-col">
                  <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Totale Complessivo</span>
                  <span className="text-xs text-slate-400">Servizi + Prodotti</span>
               </div>
               <span className="text-2xl font-bold text-slate-800">€ {totalAmount.toFixed(2)}</span>
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
        <div className="space-y-4">
           {groupedHistory.length > 0 ? (
               groupedHistory.map((group) => {
                   const isExpanded = expandedDates.has(group.date);
                   const treatmentsList = Array.from(group.treatments);
                   const summaryText = treatmentsList.slice(0, 2).join(", ") + (treatmentsList.length > 2 ? ` + ${treatmentsList.length - 2} altri` : '');
                   
                   return (
                       <div key={group.date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                           {/* Group Header */}
                           <div 
                               onClick={() => toggleDate(group.date)}
                               className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between transition-colors select-none"
                           >
                               <div className="flex items-center gap-3">
                                   <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400'}`}>
                                       {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                   </div>
                                   <div>
                                       <div className="flex items-center gap-2">
                                           <span className="font-semibold text-slate-800 capitalize">{format(new Date(group.date), 'EEEE d MMMM yyyy', { locale: it })}</span>
                                           <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">{group.items.length} {group.items.length === 1 ? 'Servizio' : 'Servizi'}</span>
                                       </div>
                                       <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                                           <span>{summaryText}</span>
                                           {group.notes.size > 0 && (
                                                <span className="text-amber-500 flex items-center" title="Ci sono note in questa giornata">
                                                    <StickyNote size={12} className="fill-amber-500" />
                                                </span>
                                           )}
                                       </div>
                                   </div>
                               </div>
                               <div className="flex flex-col items-end">
                                   <span className="font-bold text-slate-800 text-lg">€ {group.totalPrice.toFixed(2)}</span>
                                   {group.productCount > 0 && (
                                       <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                           <Package size={12} /> {group.productCount} Prodotti
                                       </span>
                                   )}
                               </div>
                           </div>
                           
                           {/* Group Details */}
                           {isExpanded && (
                               <div className="divide-y divide-slate-100 border-t border-slate-200">
                                   {group.items.map((item) => {
                                       // Calculate products total if available
                                       let prodTotal = 0;
                                       const sold: ProductSold[] = item.products_sold ?? [];
                                       sold.forEach((p) => prodTotal += (p.price * p.quantity));
                                       
                                       return (
                                           <div key={item.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${editingId === item.id ? 'bg-indigo-50/60' : ''}`}>
                                               <div className="flex-1">
                                                   <div className="flex items-center gap-2 mb-1">
                                                       <span className="font-medium text-indigo-900">{item.treatment}</span>
                                                       <span className="text-slate-400 text-xs">•</span>
                                                       <span className="text-slate-500 text-xs">{format(new Date(item.date), 'HH:mm')}</span>
                                                   </div>
                                                   
                                                   {sold.length > 0 && (
                                                       <div className="flex flex-wrap gap-1 mb-2">
                                                           {sold.map((p, i) => (
                                                               <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100" title={`€ ${p.price}`}>
                                                                   {p.quantity > 1 && <span className="mr-0.5 opacity-70">x{p.quantity}</span>}
                                                                   {p.name}
                                                               </span>
                                                           ))}
                                                       </div>
                                                   )}
                                                   
                                                   {item.notes && (
                                                       <div className="text-xs text-slate-500 flex items-start gap-1 bg-amber-50/50 p-2 rounded max-w-md">
                                                           <StickyNote size={12} className="mt-0.5 text-amber-400 shrink-0" />
                                                           <span className="italic">{item.notes}</span>
                                                       </div>
                                                   )}
                                               </div>
                                               
                                               <div className="flex items-center gap-6">
                                                   <div className="text-right">
                                                       <div className="font-bold text-slate-700">€ {((item.price || 0) + prodTotal).toFixed(2)}</div>
                                                       {prodTotal > 0 && <span className="text-[10px] text-slate-400">servizio: € {(item.price || 0).toFixed(2)}</span>}
                                                   </div>
                                                   
                                                   <div className="flex gap-1">
                                                       <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Modifica singolo intervento"
                                                       >
                                                            <Pencil size={16} />
                                                       </button>
                                                       <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Elimina singolo intervento"
                                                       >
                                                            <Trash2 size={16} />
                                                       </button>
                                                   </div>
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           )}
                       </div>
                   )
               })
           ) : (
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 italic">
                   <p className="mb-2">Nessun trattamento registrato per questo cliente.</p>
                   <span className="text-xs text-slate-300">Usa il form sopra per effettuare la prima registrazione.</span>
               </div>
           )}
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

      <ConfirmModal
        isOpen={duplicateConfirm.isOpen}
        title="Cliente Duplicato Trovato"
        message={duplicateConfirm.message}
        confirmText="Sì, usa esistente"
        cancelText="No, crea nuovo"
        isDanger={false}
        onConfirm={() => {
          if (duplicateConfirm.existingClient && onSelectExistingClient) {
            onSelectExistingClient(duplicateConfirm.existingClient);
            toast.success(`Dati di ${duplicateConfirm.existingClient.first_name} caricati! Riprova il salvataggio.`);
          }
          setDuplicateConfirm({ isOpen: false, message: '', existingClient: null, pendingFormData: null });
        }}
        onCancel={() => {
          setDuplicateConfirm({ isOpen: false, message: '', existingClient: null, pendingFormData: null });
        }}
      />
    </div>
  );
}
