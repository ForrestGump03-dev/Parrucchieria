export interface Client {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  unique_code?: string;
  birth_date?: string | null;
  birth_month?: number | null;
  is_active?: boolean;
  is_vip?: boolean;
  total_visits?: number;
  total_spent?: number;
  last_visit?: string | null;
}

export interface Product {
    id: string;
    created_at: string;
    user_id: string;
    name: string;
    brand?: string;
    price: number;
    cost_price?: number;
    stock: number;
    min_stock?: number;
    barcode?: string;
  }

export type ProductSold = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export interface Appointment {
  id: string;
  created_at: string;
  client_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:mm
  treatment: string;
  price: number | null;
  notes?: string;
  // New fields for v2.1
  staff_id?: string | null;
  duration?: number; // minutes
  products_sold?: ProductSold[];
  // Join fields
  clients?: Client;
  staff_members?: StaffMember;
}

export interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  active: boolean;
}

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'backup';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: number;
}


export interface Treatment {
  id: string;
  created_at?: string;
  name: string;
  category?: string;
  user_id?: string;
  price: number;
  duration: number;
}

export type NewClient = Omit<Client, 'id' | 'created_at'>;
export type NewAppointment = Omit<Appointment, 'id' | 'created_at' | 'clients'>;

export interface UserFeedback {
  id: string;
  created_at: string;
  user_id: string;
  type: 'bug' | 'idea' | 'other' | string;
  title: string;
  description: string;
}

/**
 * @deprecated Il modulo SaaS Stripe è stato rimosso in favore della Beta Gratuita limitata. 
 * Questa interfaccia è tenuta solo per retro-compatibilità dei vecchi trigger.
 */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'trial_expired' | string;
  price_id: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

