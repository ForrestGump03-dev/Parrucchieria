import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Package, Search, Plus, Trash2, AlertTriangle, Edit2, X } from 'lucide-react';
import type { Product } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Inventory() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
  };

  const performDelete = async () => {
    if (itemToDelete) {
      await deleteProduct(itemToDelete);
      setItemToDelete(null);
    }
  };

  const ProductModal = () => {
    // Gestiamo lo stato come string | number per permettere campi vuoti durante la digitazione
    const [form, setForm] = useState<{
        name: string;
        brand: string;
        price: string | number;
        cost_price: string | number;
        stock: string | number;
        min_stock: string | number;
      }>({
      name: editingProduct?.name || '',
      brand: editingProduct?.brand || '',
      // Se è un nuovo prodotto, partiamo da stringa vuota per non avere lo "0" fastidioso
      price: editingProduct?.price !== undefined ? editingProduct.price : '',
      cost_price: editingProduct?.cost_price !== undefined ? editingProduct.cost_price : '',
      stock: editingProduct?.stock !== undefined ? editingProduct.stock : '',
      min_stock: editingProduct?.min_stock !== undefined ? editingProduct.min_stock : 5
    });

    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Convertiamo i valori in numeri al momento del salvataggio
      const productData = {
        ...form,
        price: form.price === '' ? 0 : Number(form.price),
        cost_price: form.cost_price === '' ? 0 : Number(form.cost_price),
        stock: form.stock === '' ? 0 : Number(form.stock),
        min_stock: form.min_stock === '' ? 0 : Number(form.min_stock),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    };

    // Helper per gestire i cambi input numerici mantenendo la possibilità di svuotare il campo
    const handleNumChange = (field: keyof typeof form, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h3>
            <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Nome Prodotto</label>
              <input 
                required 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                placeholder="Es. Shampoo Ristrutturante"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Brand</label>
              <input 
                value={form.brand} 
                onChange={e => setForm({...form, brand: e.target.value})} 
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                placeholder="Es. Kerastase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">Prezzo Vendita (€)</label>
                 <input 
                   type="number" 
                   step="0.50" 
                   required 
                   value={form.price} 
                   onChange={e => handleNumChange('price', e.target.value)} 
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                   placeholder="0.00"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">Costo Acquisto (€)</label>
                 <input 
                   type="number" 
                   step="0.50" 
                   value={form.cost_price} 
                   onChange={e => handleNumChange('cost_price', e.target.value)} 
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                   placeholder="0.00"
                 />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">Giacenza Attuale</label>
                 <input 
                   type="number" 
                   required 
                   value={form.stock} 
                   onChange={e => handleNumChange('stock', e.target.value)} 
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                   placeholder="0"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700" title="Avvisami quando la scorta scende sotto questo valore">
                   Soglia Minima
                 </label>
                 <input 
                   type="number" 
                   value={form.min_stock} 
                   onChange={e => handleNumChange('min_stock', e.target.value)} 
                   className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                   placeholder="5"
                 />
               </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium shadow-sm active:scale-[0.98] transition-all"
            >
              {editingProduct ? 'Salva Modifiche' : 'Crea Prodotto'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-indigo-600" />
            Magazzino Prodotti
          </h1>
          <p className="text-slate-500">Gestisci le scorte e i prezzi di rivendita</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={20} />
          Nuovo Prodotto
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="text-slate-400" />
        <input 
          placeholder="Cerca per nome o brand..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 font-semibold">Prodotto</th>
              <th className="p-4 font-semibold">Brand</th>
              <th className="p-4 font-semibold text-right">Prezzo</th>
              <th className="p-4 font-semibold text-center">Giacenza</th>
              <th className="p-4 font-semibold text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(product => {
              const lowStock = product.stock <= (product.min_stock || 5);
              return (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {lowStock && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-medium">
                        <AlertTriangle size={12} /> Scorta in esaurimento
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">{product.brand || '-'}</td>
                  <td className="p-4 text-right font-medium text-slate-900">€ {product.price.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lowStock ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {product.stock} pz
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                         <Edit2 size={18} />
                       </button>
                       <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                  Nessun prodotto trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isModalOpen && <ProductModal />}

      <ConfirmModal 
        isOpen={!!itemToDelete}
        title="Elimina Prodotto"
        message="Sei sicuro di voler eliminare questo prodotto dal magazzino? Questa azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        isDanger={true}
        onConfirm={performDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
