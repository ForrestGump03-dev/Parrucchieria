export interface Client {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  birth_date?: string | null;
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
// NewAppointment helpers
export type NewAppointment = Omit<Appointment, 'id' | 'created_at' | 'clients'>;

