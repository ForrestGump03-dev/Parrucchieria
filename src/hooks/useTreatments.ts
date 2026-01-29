import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type Treatment } from '../types';
import { useAuth } from '../context/AuthContext';
import { TREATMENTS as DEFAULT_TREATMENTS } from '../constants/treatments';
import toast from 'react-hot-toast';

export function useTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTreatments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Se non ci sono trattamenti nel DB, usiamo quelli di default visualmente,
      // ma offriamo un modo per inizializzarli (o li inizializziamo auto).
      // Per semplicità, qui ritorniamo data vuoto se vuoto, e gestiremo l'init nel componente.
      setTreatments(data || []);
      
      // Auto-seed if empty for convenience?
      if (!data || data.length === 0) {
        // Opzionale: init automatico. Per ora lasciamo stare per dare controllo.
      }

    } catch (err: any) {
      console.error(err);
      toast.error('Errore caricamento listino');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  async function addTreatment(name: string, category: string = 'Generale') {
    if (!user) return;
    const { data, error } = await supabase
      .from('treatments')
      .insert([{ name, category, user_id: user.id }])
      .select()
      .single();
    
    if (error) {
        if (error.code === '23505') throw new Error("Trattamento già esistente");
        throw error;
    }
    setTreatments(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
    return data;
  }

  async function updateTreatment(id: string, name: string) {
    const { data, error } = await supabase
      .from('treatments')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setTreatments(prev => prev.map(t => t.id === id ? data : t).sort((a,b) => a.name.localeCompare(b.name)));
  }

  async function deleteTreatment(id: string) {
    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTreatments(prev => prev.filter(t => t.id !== id));
  }
  
  async function seedDefaults() {
      if (!user) return;
      const toInsert = DEFAULT_TREATMENTS.map(name => ({
          name,
          category: 'Default',
          user_id: user.id
      }));
      
      const { data, error } = await supabase
          .from('treatments')
          .insert(toInsert)
          .select();
          
      if (error) throw error;
      if (data) setTreatments(data.sort((a,b) => a.name.localeCompare(b.name)));
  }

  return { 
      treatments, 
      loading, 
      addTreatment, 
      updateTreatment, 
      deleteTreatment,
      seedDefaults // Esposto per riempire il DB se vuoto
  };
}
