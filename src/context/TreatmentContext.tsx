import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type Treatment } from '../types';
import { useAuth } from './AuthContext';
import { TREATMENTS as DEFAULT_TREATMENTS } from '../constants/treatments';
import toast from 'react-hot-toast';

interface TreatmentContextType {
  treatments: Treatment[];
  loading: boolean;
  fetchTreatments: () => Promise<void>;
  addTreatment: (name: string, category?: string) => Promise<Treatment | undefined>;
  updateTreatment: (id: string, name: string) => Promise<void>;
  deleteTreatment: (id: string) => Promise<void>;
  seedDefaults: () => Promise<void>;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export function TreatmentProvider({ children }: { children: ReactNode }) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTreatments = useCallback(async () => {
    if (!user) {
        setTreatments([]);
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTreatments(data || []);

    } catch (err) {
      console.error(err);
      toast.error('Errore caricamento listino');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial Fetch when user changes
  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const addTreatment = useCallback(async (name: string, category: string = 'Generale') => {
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
    setTreatments(prev => [...prev, data!].sort((a,b) => a.name.localeCompare(b.name)));
    return data;
  }, [user]);

  const updateTreatment = useCallback(async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('treatments')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setTreatments(prev => prev.map(t => t.id === id ? data! : t).sort((a,b) => a.name.localeCompare(b.name)));
  }, []);

  const deleteTreatment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTreatments(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const seedDefaults = useCallback(async () => {
      if (!user) return;
      const promises = DEFAULT_TREATMENTS.map(async (name) => {
          const { data } = await supabase.from('treatments').select('id').eq('name', name).eq('user_id', user.id).maybeSingle();
          if(!data) {
              return supabase.from('treatments').insert({ 
                name, 
                category: 'Generale', 
                user_id: user.id 
              });
          }
      });
      await Promise.all(promises);
      fetchTreatments();
  }, [user, fetchTreatments]);

  return (
    <TreatmentContext.Provider value={{
      treatments,
      loading,
      fetchTreatments,
      addTreatment,
      updateTreatment,
      deleteTreatment,
      seedDefaults
    }}>
      {children}
    </TreatmentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTreatmentContext() {
  const context = useContext(TreatmentContext);
  if (context === undefined) {
    throw new Error('useTreatmentContext must be used within a TreatmentProvider');
  }
  return context;
}
