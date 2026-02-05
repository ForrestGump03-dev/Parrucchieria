import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type Client } from '../types';
import { useAuth } from '../context/AuthContext';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchClients = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error(err);
      setError('Errore caricamento clienti');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Utente non autenticato");
    
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...client,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) throw error;
    setClients((prev) => [...prev, data]);
    return data;
  }, [user]);

  const updateClient = useCallback(async (id: string, updates: Partial<Omit<Client, 'id' | 'created_at' | 'created_by'>>) => {
    if (!user) throw new Error("Utente non autenticato");

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setClients((prev) => prev.map(c => c.id === id ? data : c));
    return data;
  }, [user]);

  const deleteClient = useCallback(async (id: string) => {
    // Prima eliminiamo gli appuntamenti collegati (altrimenti il DB dà errore per vincoli)
    await supabase.from('appointments').delete().eq('client_id', id);
    
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    
    setClients((prev) => prev.filter(c => c.id !== id));
  }, []);

  const getClientByPhone = useCallback(async (phone: string) => {
     const { data, error } = await supabase
       .from('clients')
       .select('*')
       .eq('phone', phone)
       .maybeSingle();
     
     if (error) {
       console.error("Error confirming phone", error);
       return null;
     }
     return data;
  }, []);

  const findPotentialDuplicates = useCallback(async (firstName: string, lastName: string) => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim());
    
    return data || [];
  }, []);

  return { clients, loading, error, fetchClients, addClient, updateClient, deleteClient, getClientByPhone, findPotentialDuplicates };
}
