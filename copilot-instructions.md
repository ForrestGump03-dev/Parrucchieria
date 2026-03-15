# Istruzioni Progetto: Root Manager 3.0

Queste sono le istruzioni base da fornire agli assistenti IA per comprendere l'architettura e lo schema del database di Root Manager.

## Tecnologie in uso
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **App Desktop / Wrapper**: Electron (in fase di transizione: si passerà in futuro a una tipica Web App / PWA Hosted)
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
- `is_active`: boolean (Usata per il soft-delete. Non effettuare mai eliminazioni fisiche dei record clienti)
- `total_visits`: integer (Calcolato automaticamente server-side via db trigger)
- `total_spent`: numeric (Calcolato automaticamente server-side via db trigger)
- `last_visit`: date (Aggiornato automaticamente server-side via db trigger)
- `created_at`: timestamptz

### Tabella: appointments
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `client_id`: uuid (FK -> clients.id)
- `treatment`: text
- `date`: date
- `start_time`: text (HH:mm)
- `duration`: integer
- `price`: numeric (Se *null*, l'appuntamento è solo prenotato in agenda "non pagato". Se compilato, l'incasso è registrato effettivamente in cassa)
- `notes`: text
- `staff_id`: uuid (FK -> staff.id)
- `products_sold`: jsonb (Array di oggetti prodotto: `[{ name, price, quantity }]` venduti contestualmente all'appuntamento)
- `created_at`: timestamptz

### Tabella: products
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `brand`: text (Opzionale)
- `barcode`: text (Opzionale)
- `price`: numeric (Prezzo di vendita al pubblico)
- `cost_price`: numeric (Costo d'acquisto per calcolo margini futuri, Opzionale)
- `stock`: integer
- `min_stock`: integer (Soglia minima scorta)
- `created_at`: timestamptz

### Tabella: treatments (Listino / Nomenclatore)
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `category`: text
- `created_at`: timestamptz
*(Nota: I trattamenti sono solo voci di dizionario. Non hanno prezzo fisso o durata sul database, per consentire al parrucchiere massima flessibilità durante la registrazione o prenotazione dell'appuntamento in salone)*

### Tabella: staff (Parrucchieri/Operatori)
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `name`: text
- `color`: text (Codice colore esagonale per l'agenda UI)
- `active`: boolean
- `created_at`: timestamptz

## Linee Guida di Sviluppo
- Utilizza sempre `supabase.from('nome_tabella')`. Fai affidamento al backend Supabase ed alle policy RLS per dividere le utenze in multi-tenant per il campo `user_id`.
- **Clienti e Soft Delete**: Non chiamare mai `delete()` sulla tabella `clients`. I clienti vanno solo "nascosti" via update impostando `is_active = false`. Questo preserva lo storico appuntamenti integro per la reportistica e i backup. Durante liste clienti (`useClients`), assicurarsi di filtrare `is_active: true`.
- **Statistiche Dinamiche e Statiche**: Calcoli di fatturato nel periodo mensile o annuale continuano ad essere effettuati al volo sul front-end aggregando gli array di `appointments` filtrati; Tuttavia, i contatori "lifetime" di ogni cliente (`total_visits`, `total_spent`, `last_visit`) sono calcolati automaticamente da dei `TRIGGER` in PostgreSql lato server ogni volta che viene segnato/cancellato un appuntamento pagato, pertanto sul front-end è sufficiente limitarsi a leggerli da base dati.
