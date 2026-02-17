import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Product } from '../types';
import toast from 'react-hot-toast';

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Errore caricamento prodotti');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      setProducts(prev => [...prev, data]);
      toast.success('Prodotto aggiunto');
      return data;
    } catch (e) {
      console.error(e);
      toast.error('Errore aggiunta prodotto');
      throw e;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Prodotto aggiornato');
    } catch (e) {
      console.error(e);
      toast.error('Errore aggiornamento');
      throw e;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Prodotto eliminato');
    } catch (e) {
      console.error(e);
      toast.error('Errore eliminazione');
    }
  };

  const decrementStock = async (id: string, quantity: number) => {
    try {
      const { error } = await supabase.rpc('decrement_stock', { p_id: id, quantity });
      if (error) throw error;
      // Optimistic update
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock - quantity } : p));
    } catch (e) {
      console.error("Stock update failed", e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    decrementStock
  };
}
