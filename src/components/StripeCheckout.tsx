import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface StripeCheckoutProps {
  priceId: string;
  buttonText: string;
  className?: string;
  planName?: string;
}

export function StripeCheckout({ priceId, buttonText, className = '', planName }: StripeCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Invochiamo la Edge Function usando il metodo nativo di supabase-js
      // questo passa automaticamente il token JWT e bypassiamo la costruzione manuale del fetch
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Nessun URL restituito da Stripe');
      }
    } catch (error: any) {
      console.error('Errore Checkout:', error);
      toast.error(`Errore di connessione a Stripe. Riprova più tardi.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout} 
      disabled={loading || !user} 
      className={`flex items-center justify-center gap-2 font-bold transition disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin flex-shrink-0" />
          <span>Elaborazione...</span>
        </>
      ) : (
        <>
          <CreditCard size={20} className="flex-shrink-0" />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
