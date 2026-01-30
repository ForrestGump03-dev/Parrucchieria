export interface Client {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface Appointment {
  id: string;
  created_at: string;
  client_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:mm
  treatment: string;
  price: number | null;
  notes?: string;
  // Join fields
  clients?: Client;
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

