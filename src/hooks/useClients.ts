import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type Client } from '../types';
import { useAuth } from '../context/AuthContext';

export interface FetchClientsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'a-z' | 'recent';
  activeTab?: 'all' | 'birthdays';
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchClients = useCallback(async (options?: FetchClientsOptions) => {
    if (!user) return;
    try {
      setLoading(true);
      
      const page = options?.page || 1;
      const limit = options?.limit || 15;
      const search = options?.search || '';
      const sortOrder = options?.sortOrder || 'a-z';
      const activeTab = options?.activeTab || 'all';

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,unique_code.ilike.%${search}%`);
      }

      if (activeTab === 'birthdays') {
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        query = query.eq('birth_month', currentMonth);
      }

      if (sortOrder === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('first_name', { ascending: true }).order('last_name', { ascending: true });
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      setClients(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error(err);
      setError('Errore caricamento clienti');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Component that needs clients on mount must call fetchClients() itself.

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Utente non autenticato");
    
    const processedClient = { ...client };
    if (processedClient.birth_date === "") processedClient.birth_date = null;
    if (processedClient.email === "") processedClient.email = null;

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...processedClient,
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

    const processedUpdates = { ...updates };
    if (processedUpdates.birth_date === "") processedUpdates.birth_date = null;
    if (processedUpdates.email === "") processedUpdates.email = null;

    const { data, error } = await supabase
      .from('clients')
      .update(processedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setClients((prev) => prev.map(c => c.id === id ? data : c));
    return data;
  }, [user]);

  const deleteClient = useCallback(async (id: string) => {
    if (!user) throw new Error("Utente non autenticato");
    const { error } = await supabase.from('clients').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    
    setClients((prev) => prev.filter(c => c.id !== id));
  }, [user]);

  const getClientByPhone = useCallback(async (phone: string) => {
     const { data, error } = await supabase
       .from('clients')
       .select('*')
       .eq('phone', phone)
       .eq('is_active', true)
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
      .ilike('last_name', lastName.trim())
      .eq('is_active', true);
    
    return data || [];
  }, []);

  return { 
    clients, 
    totalCount,
    loading, 
    error, 
    fetchClients, 
    addClient, 
    updateClient, 
    deleteClient,
    findPotentialDuplicates,
    getClientByPhone
  };
}
