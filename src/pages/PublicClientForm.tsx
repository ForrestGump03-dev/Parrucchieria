import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { UserCheck, CheckCircle, RefreshCcw, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';

const publicClientSchema = z.object({
  first_name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  last_name: z.string().min(2, 'Il cognome deve avere almeno 2 caratteri'),
  phone: z.string().min(9, 'Numero di telefono non valido'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal(''))
});

type PublicClientFormType = z.infer<typeof publicClientSchema>;

export default function PublicClientForm() {
  const { salonId } = useParams(); // URL format: /qr/:salonId
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<PublicClientFormType>({
    resolver: zodResolver(publicClientSchema)
  });

  const onSubmit = async (data: PublicClientFormType) => {
    if (!salonId) {
      toast.error('Link QR Code non valido. Contatta il salone.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Controlla se il cliente esiste già per questo salone (SOLO tramite telefono per evitare duplicati da errori di battitura sui nomi)
      // Estraiamo solo i numeri e prendiamo gli ultimi 9 (spesso i numeri italiani sono di 10, ma 9 è più sicuro per match parziali)
      const cleanSearchPhone = data.phone.replace(/\D/g, '').slice(-9);
      
      const { data: existingClients, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', salonId)
        .ilike('phone', `%${cleanSearchPhone}%`);

      if (searchError) throw searchError;

      let matchedClient = null;

      if (existingClients && existingClients.length > 0) {
          // Match by phone
          matchedClient = existingClients[0];
      } else {
          // Fallback: match EXACTLY by first_name and last_name (case-insensitive) 
          // This catches users who changed their phone number but entered the exact same name
          const { data: nameMatchClients, error: nameError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', salonId)
            .ilike('first_name', data.first_name)
            .ilike('last_name', data.last_name);
            
          if (!nameError && nameMatchClients && nameMatchClients.length === 1) {
              // Only match if there is exactly ONE person with that name to avoid mixing up "Maria Rossi"
              matchedClient = nameMatchClients[0];
          }
      }

      if (matchedClient) {
          // Aggiorna il cliente esistente
          const clientId = matchedClient.id;
          const { error: updateError } = await supabase
              .from('clients')
              .update({
                  first_name: data.first_name, // Sovrascrive (utile se il parrucchiere aveva segnato un nomignolo)
                  last_name: data.last_name,
                  phone: data.phone, // Aggiorna numero di telefono in caso la ricerca per nome abbia avuto successo
                  email: data.email || null,
                  birth_date: data.birth_date || null,
                  // Tieni intatto total_visits e spent e last_visit
              })
              .eq('id', clientId);
          
          if (updateError) throw updateError;
          setIsSubmitted(true);
      } else {
          // Inserisci un nuovo cliente
          const { error: insertError } = await supabase
              .from('clients')
              .insert([{
                  user_id: salonId,
                  first_name: data.first_name,
                  last_name: data.last_name,
                  phone: data.phone,
                  email: data.email || null,
                  birth_date: data.birth_date || null,
                  total_visits: 0,
                  total_spent: 0
              }]);
          
          if (insertError) throw insertError;
          setIsSubmitted(true);
      }

    } catch (err: unknown) {
      console.error(err);
      toast.error("Si è verificato un errore di connessione.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden text-center p-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                <CheckCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Sei nella Lista VIP!</h1>
            <p className="text-slate-600 mb-8">
                Grazie per esserti registrato. Riceverai presto le nostre promozioni e novità esclusive direttamente su WhatsApp.
            </p>
            <button 
                onClick={() => setIsSubmitted(false)}
                className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                type="button"
            >
                Torna al modulo
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl max-w-md w-full rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/20">
        
        {/* Header Elegante */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg ring-1 ring-white/30">
                    <Sparkles size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">Lista VIP</h1>
                <p className="text-indigo-100 font-medium">Iscriviti per sbloccare promozioni esclusive e novità dal nostro salone.</p>
            </div>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome *</label>
                    <input 
                      {...register('first_name')}
                      className={`w-full p-3 rounded-xl border ${errors.first_name ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                      placeholder="Es. Mario"
                    />
                    {errors.first_name && <span className="text-red-500 text-xs mt-1 block font-medium">{errors.first_name.message}</span>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cognome *</label>
                    <input 
                      {...register('last_name')}
                      className={`w-full p-3 rounded-xl border ${errors.last_name ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                      placeholder="Es. Rossi"
                    />
                    {errors.last_name && <span className="text-red-500 text-xs mt-1 block font-medium">{errors.last_name.message}</span>}
                  </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cellulare (WhatsApp) *</label>
                <input 
                  {...register('phone')}
                  className={`w-full p-3 rounded-xl border ${errors.phone ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                  placeholder="Es. +39 333 1234567"
                  type="tel"
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1 block font-medium">{errors.phone.message}</span>}
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    Tratteremo il tuo numero solo per inviarti promozioni speciali.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Opzionale)</span></label>
                <input 
                  {...register('email')}
                  className={`w-full p-3 rounded-xl border ${errors.email ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                  placeholder="mario@example.com"
                  type="email"
                />
                {errors.email && <span className="text-red-500 text-xs mt-1 block font-medium">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data di Nascita <span className="text-slate-400 font-normal">(Regalo di Compleanno!)</span></label>
                <input 
                  {...register('birth_date')}
                  type="date"
                  className={`w-full p-3 rounded-xl border ${errors.birth_date ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700`}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold p-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                    <RefreshCcw className="animate-spin" size={20} />
                ) : (
                    <>
                       <UserCheck size={20} className="group-hover:scale-110 transition-transform" />
                       ISCRIVITI ORA
                    </>
                )}
              </button>
            </form>
            
            <p className="text-center text-[10px] text-slate-400 mt-6 max-w-xs mx-auto">
                Cliccando su Iscriviti accetti la memorizzazione e gestione dei tuoi dati dal salone in conformità alla GDPR per finalità di marketing.
            </p>
        </div>
      </div>
    </div>
  );
}
