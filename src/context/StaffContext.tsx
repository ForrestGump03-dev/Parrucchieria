import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { type StaffMember } from '../types';
import toast from 'react-hot-toast';

interface StaffContextType {
  staff: StaffMember[];
  loading: boolean;
  addStaff: (name: string, color?: string) => Promise<StaffMember | undefined>;
  updateStaff: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStaff(data as StaffMember[] || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Errore caricamento staff');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Ascolta per il focus della finestra per aggiornare i dati
  useEffect(() => {
    const handleFocus = () => {
      fetchStaff();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchStaff]);


  const addStaff = async (name: string, color?: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .insert([{ user_id: user.id, name, color, active: true }])
        .select()
        .single();

      if (error) throw error;
      
      const newStaff = data as StaffMember;
      setStaff(prev => [...prev, newStaff]);
      return newStaff;
    } catch (error) {
      console.error('Error adding staff:', error);
      throw error;
    }
  };

  const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
    try {
      const { error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
        const { error } = await supabase
            .from('staff_members')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setStaff(prev => prev.filter(s => s.id !== id));
    } catch (error) {
        console.error('Error deleting staff:', error);
        throw error;
    }
  };

  const refreshStaff = async () => {
    await fetchStaff();
  };

  return (
    <StaffContext.Provider value={{ staff, loading, addStaff, updateStaff, deleteStaff, refreshStaff }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}
