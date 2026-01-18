# Gestionale Parrucchieria v0.1.0

Programma gestionale per parrucchieri sviluppato con React, Tailwind CSS e Supabase.

## Funzionalità Principali

### 📅 Agenda & Appuntamenti (Dashboard)
- **Vista Giornaliera**: Visualizzazione di default impostata su "Giorno" con slot temporali di 30 minuti per una gestione precisa.
- **Drag & Drop**: Spostamento rapido degli appuntamenti.
- **Menu Contestuale**: Tasto destro sull'appuntamento per **Modificare** o **Eliminare**.
- **Flusso Eliminazione Sicura**: 
  - Eliminazione Appuntamento -> Apre un **Toast Non Bloccante** (5 secondi).
  - Il Toast permette di eliminare anche l'anagrafica cliente se necessario, altrimenti scompare automaticamente.

### 👥 Gestione Clienti
- **Lista Clienti**: Ricerca veloce in tempo reale per nome/telefono.
- **Aggiornamento Istantaneo**: La lista clienti si aggiorna immediatamente dopo la creazione o l'eliminazione di un'anagrafica.
- **Storico Clienti**: Nella sezione "Cassa/Nuovo Appuntamento", viene mostrato solo lo **storico passato** (appuntamenti precedenti a oggi), ordinato dal più recente.

### 💰 Cassa & Trattamenti
- **Form Intelligente**: Autocompilazione dati e recupero dell'ultimo prezzo applicato per quel trattamento specifico.
- **Feedback Immediato**: Avvisi visivi per operazioni critiche (eliminazioni irreversibili).

---

## Stato del Progetto e Dipendenze (18/01/2026)

### Versione
**Versione Attuale**: `0.1.0` (Alpha)

### Dipendenze Core
| Pacchetto | Versione | Scopo |
|-----------|----------|-------|
| `react` | `^19.2.0` | Libreria UI principale |
| `vite` | `^7.2.4` | Build tool e dev server |
| `typescript` | `~5.9.3` | Linguaggio |
| `@supabase/supabase-js` | `^2.90.1` | Client Database Backend |
| `react-router-dom` | `^7.12.0` | Navigazione |

### UI & Stile
| Pacchetto | Versione | Scopo |
|-----------|----------|-------|
| `tailwindcss` | `^4.1.18` | Framework CSS |
| `lucide-react` | `^0.562.0` | Icone |
| `react-big-calendar` | `^1.19.4` | Componente Calendario/Agenda |
| `date-fns` | `^4.1.0` | Manipolazione date |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.4.0` | Gestione classi CSS dinamiche |

### Form & Validazione
| Pacchetto | Versione | Scopo |
|-----------|----------|-------|
| `react-hook-form` | `^7.71.1` | Gestione form |
| `zod` | `^4.3.5` | Validazione schemi |
| `@hookform/resolvers` | `^5.2.2` | Integrazione Zod/ReactHookForm |

---

## Changelog Recente (18/01/2026)
1.  **Agenda Refactoring**: 
    - Impostata vista Giorno come default.
    - Slot temporali portati a 30 minuti.
    - Implementato menu contestuale (tasto destro).
2.  **Safety Features**:
    - Creato componente `ConfirmModal` per conferme critiche.
    - Creato componente `DeleteClientToast`: notifica a tempo per eliminazione opzionale del cliente post-appuntamento.
3.  **UX Improvements**:
    - Fix visualizzazione storico (solo appuntamenti passati).
    - Aggiornamento reattivo delle liste clienti dopo eliminazione senza refresh pagina.
    - Correzione bug sintassi nei form.

---

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
