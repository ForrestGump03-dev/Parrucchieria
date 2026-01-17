# Gestionale Parrucchieria

Programma gestionale per parrucchieri sviluppato con React, Tailwind CSS e Supabase.

## Funzionalità
- **Dashboard**: Vista principale per gestire gli appuntamenti.
- **Lista Clienti**: Ricerca veloce e selezione clienti.
- **Nuovo Appuntamento**: Form intelligente che autocompila i dati del cliente e ricorda l'ultimo prezzo del trattamento.
- **Storico**: Visualizzazione immediata dello storico trattamenti per ogni cliente.
- **Gestione Clienti**: (In arrivo) Modifica ed eliminazione anagrafiche.

## Setup Iniziale

### 1. Prerequisiti
- Node.js installato.
- Account Supabase (Piano Free).

### 2. Configurazione Database (Supabase)
Crea un nuovo progetto su Supabase e vai nella sezione **SQL Editor**. Incolla ed esegui il seguente script per creare le tabelle:

```sql
-- Tabella Clienti
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  first_name text not null,
  last_name text not null,
  phone text not null
);

-- Tabella Appuntamenti
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references public.clients(id) not null,
  date date not null,
  treatment text not null,
  price numeric not null,
  notes text
);

-- Policy (Opzionale: disabilita RLS per test rapidi oppure abilita accesso pubblico)
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

create policy "Accesso pubblico clienti" on public.clients for all using (true);
create policy "Accesso pubblico appuntamenti" on public.appointments for all using (true);
```

### 3. Configurazione Progetto Locale
1. Clona o scarica il progetto.
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Rinomina il file `.env.example` (se non presente crealo) in `.env` e inserisci le tue chiavi Supabase:
   ```env
   VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
   VITE_SUPABASE_ANON_KEY=tua-chiave-anon-public
   ```

### 4. Avvio
Esegui il comando:
```bash
npm run dev
```
Apri il browser su `http://localhost:5173`.

## Stack Tecnologico
- **Frontend**: React (Vite)
- **Lingukaggio**: TypeScript
- **Stile**: Tailwind CSS
- **Icone**: Lucide React
- **Backend/DB**: Supabase (PostgreSQL)
- **Routing**: React Router Dom

## Note per lo Sviluppo Futuro
- Per trasformare in app desktop, è consigliato integrare **Electron** nel progetto (già predispostocome struttura React).
- Implementare autenticazione utente (Login parrucchiere) se necessario accedervi via internet.
