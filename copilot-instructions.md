# Istruzioni Progetto: Root Manager 3.0

Queste sono le istruzioni base da fornire agli assistenti IA per comprendere l'architettura e lo schema del database di Root Manager.

## Tecnologie in uso
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend / Database**: Supabase (PostgreSQL)
- **Form & Validazione**: React Hook Form + Zod
- **Varie**: Date-fns, Recharts, ExcelJS, file-saver, Lucide React

## Schema del Database (PostgreSQL / Supabase)

### Tabella: clients
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `first_name`: text
- `last_name`: text
- `phone`: text
- `email`: text (Opzionale)
- `birth_date`: date (Opzionale)
- `total_visits`: integer
- `total_spent`: numeric
- `last_visit`: date
- `notes`: text
- `is_active`: boolean
- `created_at`: timestamptz

### Tabella: appointments
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `client_id`: uuid (FK -> clients.id)
- `treatment`: text
- `date`: date
- `start_time`: time
- `duration`: integer
- `price`: numeric (Se *null*, l'appuntamento è solo in agenda. Se compilato, è registrato in cassa)
- `notes`: text
- `staff_id`: uuid (FK -> staff.id)
- `products_sold`: jsonb (Array di prodotti venduti contestualmente all'appuntamento)
- `created_at`: timestamptz

### Tabella: products
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `brand`: text
- `category`: text
- `price`: numeric
- `stock`: integer
- `min_stock`: integer
- `created_at`: timestamptz

### Tabella: treatments (Listino)
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `price`: numeric
- `duration`: integer
- `created_at`: timestamptz

### Tabella: staff (Parrucchieri/Operatori)
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `role`: text
- `color`: text (Codice colore esagonale per l'agenda)
- `is_active`: boolean
- `created_at`: timestamptz

## Linee Guida di Sviluppo
- Utilizza sempre `supabase.from('tabella')` specificando le policy RLS se necessario (filtri su `user_id` gestiti dalle policy backend dove applicabile).
- Non cancellare mai fisicamente i clienti (`is_active: false` preferito, o cascading).
- Per le chiamate API ripetute o l'aggregazione di dati, usa gli Hook customizzati (es. `useClients`, `useAppointments`) che mantengono uno state interno.
- Mantenere le interfacce Typecript sempre sincronizzate con lo schema Supabase (file `src/types/index.ts`).
