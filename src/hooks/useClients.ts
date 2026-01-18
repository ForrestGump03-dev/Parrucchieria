import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Client } from '../types';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addClient(client: Omit<Client, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();

    if (error) throw error;
    setClients((prev) => [...prev, data]);
    return data;
  }

  async function deleteClient(id: string) {
    // Prima eliminiamo gli appuntamenti collegati (altrimenti il DB dà errore per vincoli)
    await supabase.from('appointments').delete().eq('client_id', id);
    
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    
    setClients((prev) => prev.filter(c => c.id !== id));
  }

  return { clients, loading, error, fetchClients, addClient, deleteClient };
}
