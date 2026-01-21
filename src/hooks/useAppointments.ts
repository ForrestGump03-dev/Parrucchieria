import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Appointment, type NewAppointment } from '../types';
import { useAuth } from '../context/AuthContext';

export function useAppointments() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  async function addAppointment(appointment: NewAppointment) {
    if (!user) throw new Error("Utente non autenticato");

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
           ...appointment,
           user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function getClientHistory(clientId: string) {
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      // Modifica fondamentale: mostra solo se hanno un prezzo (quindi pagati/registrati in cassa)
      // OPPURE se la data è passata. Ma la richiesta specifica "solo se registro il trattamento in cassa".
      // Assumiamo che "registrato in cassa" significhi price != null (o > 0 nel vecchio schema, ma ora stiamo usando null per quelli in agenda)
      .not('price', 'is', null) 
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Appointment[];
  }

  async function getAppointmentsForRange(start: Date, end: Date) {
     const { data, error } = await supabase
      .from('appointments')
      .select('*, clients(*)') // Join with clients to show name in calendar
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());
      
    if (error) throw error;
    return data as Appointment[];
  }

  async function deleteAppointment(id: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async function updateAppointment(id: string, updates: Partial<NewAppointment>) {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async function getLastPriceForTreatment(treatment: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('price')
      .eq('treatment', treatment)
      .gt('price', 0) // Ignore 0/unpaid prices
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
       console.error("Error fetching last price", error);
    }
    
    return data?.price || null;
  }

  async function getClientAppointmentsByTime(clientId: string, date: string, time: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', date)
      .eq('start_time', time)
      .is('price', null); // Agenda only
      
    if (error) throw error;
    return data as Appointment[];
  }

  return { 
    addAppointment, 
    getClientHistory, 
    getAppointmentsForRange, 
    getLastPriceForTreatment, 
    deleteAppointment, 
    updateAppointment, 
    getClientAppointmentsByTime,
    loading 
  };
}
