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

export type NewClient = Omit<Client, 'id' | 'created_at'>;
// NewAppointment helpers
export type NewAppointment = Omit<Appointment, 'id' | 'created_at' | 'clients'>;

export interface Treatment {
  id: string;
  created_at: string;
  name: string;
  category?: string;
  price: number;
  duration: number;
}

