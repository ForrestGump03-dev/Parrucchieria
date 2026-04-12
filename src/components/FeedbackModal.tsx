import React, { useState } from 'react';
import { X, Send, AlertTriangle, Lightbulb, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'bug' | 'idea' | 'other'>('bug');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      if (!user) throw new Error('Utente non autenticato');

      const { error } = await supabase.from('user_feedbacks').insert({
        user_id: user.id,
        type,
        title: type === 'bug' ? 'Segnalazione Problema' : type === 'idea' ? 'Nuova Segnalazione Idea' : 'Altro Feedback',
        description: message,
      });

      if (error) throw error;

      toast.success('Feedback inviato con successo! Grazie per il tuo contributo.');
      setMessage('');
      onClose();
    } catch (error: any) {
      toast.error('Errore durante l\'invio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Invia Feedback</h2>
            <p className="text-sm text-slate-500 mt-1">Aiutaci a migliorare l'applicazione</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Tipo di segnalazione</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    type === 'bug'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <AlertTriangle size={24} className={type === 'bug' ? 'text-red-500' : ''} />
                  <span className="text-xs font-semibold">Problema</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('idea')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    type === 'idea'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <Lightbulb size={24} className={type === 'idea' ? 'text-indigo-500' : ''} />
                  <span className="text-xs font-semibold">Idea</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('other')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    type === 'other'
                      ? 'border-slate-800 bg-slate-50 text-slate-900'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <MessageSquare size={24} className={type === 'other' ? 'text-slate-800' : ''} />
                  <span className="text-xs font-semibold">Altro</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrizione <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-32"
                placeholder="Descrivi dettagliatamente cosa è successo o cosa vorresti migliorare..."
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Invia 
          </button>
        </div>
      </div>
    </div>
  );
}
