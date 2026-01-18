import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Appointment, type NewAppointment } from '../types';

export function useAppointments() {
  const [loading, setLoading] = useState(false);
  
  async function addAppointment(appointment: NewAppointment) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function getClientHistory(clientId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .lte('date', today) // Mostra solo storia passata o odierna, non futura
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
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
       console.error("Error fetching last price", error);
    }
    
    return data?.price || null;
  }

  return { addAppointment, getClientHistory, getAppointmentsForRange, getLastPriceForTreatment, deleteAppointment, updateAppointment, loading };
}
