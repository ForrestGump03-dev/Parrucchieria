import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { type Appointment, type NewAppointment } from '../types';
import { useAuth } from '../context/AuthContext';

export function useAppointments() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const addAppointment = useCallback(async (appointment: NewAppointment) => {
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
  }, [user]);

  const getClientHistory = useCallback(async (clientId: string) => {
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .not('price', 'is', null) 
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Appointment[];
  }, []);

  const getAppointmentsForRange = useCallback(async (start: Date, end: Date) => {
     const startStr = format(start, 'yyyy-MM-dd');
     const endStr = format(end, 'yyyy-MM-dd');

     const { data, error } = await supabase
      .from('appointments')
      .select('*, clients(*)') // Join with clients to show name in calendar
      .is('price', null)
      .gte('date', startStr)
      .lte('date', endStr);
      
    if (error) throw error;
    return data as Appointment[];
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  const updateAppointment = useCallback(async (id: string, updates: Partial<NewAppointment>) => {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }, []);

  const getLastPriceForTreatment = useCallback(async (treatment: string) => {
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
  }, []);

  const getClientAppointmentsByTime = useCallback(async (clientId: string, date: string, time: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', date)
      .eq('start_time', time)
      .is('price', null); // Agenda only
      
    if (error) throw error;
    return data as Appointment[];
  }, []);

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
