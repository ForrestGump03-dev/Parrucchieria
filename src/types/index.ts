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
  date: string; // ISO date string
  treatment: string;
  price: number;
  // Join fields
  clients?: Client;
}

export type NewClient = Omit<Client, 'id' | 'created_at'>;
export type NewAppointment = Omit<Appointment, 'id' | 'created_at' | 'clients'>;
