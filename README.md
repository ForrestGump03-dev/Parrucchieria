# Gestionale Parrucchieria v1.0.1

Programma gestionale per parrucchieri sviluppato con React, Tailwind CSS e Supabase.

## Funzionalità Principali

### 🔐 Sicurezza & Multi-Utente (Novità v1.0.1)
- **Login Protetto**: Accesso tramite Email e Password.
- **Isolamento Dati**: Ogni Salone/Utente vede SOLO i propri clienti e appuntamenti (Database Multi-Tenant gestito via Supabase RLS).
- **Sessione Sicura**: Gestione automatica della sessione utente.

### 📅 Agenda & Appuntamenti (Dashboard)
- **Vista Giornaliera**: Visualizzazione di default impostata su "Giorno".
- **Visualizzazione Cluster**: Gli appuntamenti sovrapposti o molto vicini vengono raggruppati automaticamente in un unico blocco ("Cluster") per evitare confusione visiva.
  - I cluster raggruppano appuntamenti entro un arco di 45 minuti.
  - Cliccando sul cluster si apre un modale per selezionare l'appuntamento specifico.
- **Micro-Schede**: Le schede degli appuntamenti sono compatte, mostrano solo l'ora di inizio e il nome, nascondendo l'orario di fine per pulizia.
- **Logica Prenotazione**: Gli appuntamenti presi dall'agenda vengono salvati come "Prenotazioni" (Prezzo: Da definire/Null), distinguendoli dai trattamenti già pagati.
- **Supporto Multi-Trattamento**: È possibile prenotare più servizi (es. Taglio + Colore) in un'unica sessione.
- **Vista Focalizzata**: Gli appuntamenti già incassati/pagati vengono nascosti dall'agenda per mantenere la vista pulita.
- **Drag & Drop**: Spostamento rapido degli appuntamenti.
- **Menu Contestuale**: Tasto destro sull'appuntamento per **Modificare** o **Eliminare**.
- **Flusso Eliminazione Sicura**: Eliminazione con toast di conferma per eventuale cancellazione cliente correlato.

### 👥 Gestione Clienti
- **Lista Clienti**: Ricerca veloce in tempo reale per nome/telefono.
- **Storico Intelligente**: Lo storico clienti mostra **SOLO** i trattamenti effettivamente eseguiti e registrati in cassa (quelli con un prezzo definito). Le prenotazioni future o non ancora pagate non inquinano lo storico.
- **Aggiornamento Istantaneo**: Liste reattive alle modifiche.

### 💰 Cassa & Trattamenti
- **Registrazione Incassi (Modalità Carrello)**: Possibilità di registrare molteplici trattamenti in una singola sessione per lo stesso cliente.
- **Autocompilazione**: Recupero automatico dell'ultimo prezzo pagato dal cliente per lo stesso trattamento.
- **Storico**: I trattamenti inseriti da qui finiscono direttamente nello storico del cliente.

### 📊 Analisi & Report
- **Analisi Finanziaria**: Dashboard completa con filtri temporali dinamici (Oggi, Settimana, Mese, Anno, Mese Scorso) e **Intervallo Personalizzato**.
- **Metriche Avanzate**:
  - **Penetrazione Servizi**: Visualizzazione grafica (%) di quanto spesso un servizio viene scelto rispetto al totale delle visite uniche.
  - **Visite Uniche**: Conteggio intelligente che unifica trattamenti multipli dello stesso cliente nello stesso giorno.
  - **Trend**: Confronto automatico della crescita rispetto al periodo precedente equivalente.
- **Top Ranking**: Classifiche per Fatturato Servizi e Fedeltà Clienti.

## Sviluppo & Ambienti (Workflow)

Il progetto supporta la separazione tra ambiente di Sviluppo (DEV) e Produzione (PROD) per permettere aggiornamenti sicuri mentre i clienti usano l'app.

### 1. Configurazione Ambienti
- **Produzione (PROD)**: 
  - File: `.env`
  - Comando: `npm run build` / Esecuzione da Electron
  - Dati: Reali dei clienti.
- **Sviluppo (DEV)**:
  - File: `.env.development`
  - Comando: `npm run dev`
  - Dati: Finti/Test.

### 2. Inizializzare un Nuovo Ambiente (es. DEV)
Se crei un nuovo progetto Supabase per lo sviluppo:
1.  Copia le chiavi API nel file `.env.development`.
2.  Vai nell'**SQL Editor** del nuovo progetto Supabase.
3.  Esegui lo script: `supabase/migrations/000_init_full_schema.sql` per creare tabelle e attivare la sicurezza.

### 3. Versione Desktop (Electron)
Il progetto è configurato per essere trasformato in un file `.exe` installabile.

**Comandi:**
- **Avvio in modalità Sviluppo (App Desktop)**:
  ```bash
  npm run electron:dev
  ```
- **Creazione Eseguibile (.exe)**:
  ```bash
  npm run electron:pack
  ```
  Il file di installazione si troverà nella cartella `release/`.

**Nota Icona**: Per personalizzare l'icona dell'eseguibile, sostituisci il file `public/favicon.ico` con il logo del tuo salone (deve essere formato .ico).

---

## Stato del Progetto e Dipendenze (21/01/2026)

### Versione
**Versione Attuale**: `1.0.1` (Release)

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

---

## Changelog Recente - v1.0.1 (Release Ufficiale)

1.  **Sicurezza Enterprise**:
    - **Multi-Tenancy**: Architettura database isolata. Un singolo database supporta infiniti clienti in sicurezza totale.
    - **Row Level Security (RLS)**: Le query al database sono filtrate automaticamente lato server. Nessun rischio di fuga dati tra saloni.
    - **Autenticazione**: Pagina di Login nativa integrata.

2.  **Multi-Service System**:
    - **Cassa**: Possibilità di aggiungere più trattamenti ("Carrello") prima di salvare.
    - **Agenda**: Possibilità di prenotare più servizi per un cliente in un unico slot.

3.  **Analisi & Statistiche**:
    - **Custom Range**: Aggiunto selettore date personalizzato nella pagina Report.
    - **Miglioramenti UI**: Fix su statistiche "Oggi" e formattazione percentuali di crescita.

## Changelog Precedente (21/01/2026) - v0.2.1
1.  **Agenda Cluster System**: 
    - Risolto problema sovrapposizione visiva appuntamenti.
    - Implementato sistema di raggruppamento (max 45min) per appuntamenti vicini.
    - Introdotta logica di "Stacking" verticale per gruppi adiacenti.
2.  **Logica Business**:
    - Separazione netta tra **Prenotazione** (Agenda -> Prezzo Null) e **Vendita** (Cassa -> Prezzo definito).
    - Filtro storico clienti: ora mostra solo le vendite confermate.
3.  **UI/UX**:
    - Restyling schede appuntamento (più compatte, rimosso orario fine).
    - Migliorato modale selezione cluster.
    - Rimozione campo Prezzo nel modale Agenda (inutile in fase di prenotazione).

---

## Setup Iniziale

### 1. Prerequisiti
- Node.js installato.
- Account Supabase (Piano Free).

### 2. Configurazione Database (Supabase)
Crea un nuovo progetto su Supabase e vai nella sezione **SQL Editor**. 

**IMPORTANTE**: Per la versione 0.2.0 è necessario che il campo `price` accetti valori NULL.

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
  start_time text, -- Opzionale, formato HH:mm
  treatment text not null,
  price numeric, -- NOTA: Deve essere 'numeric' semplice (senza 'not null') per accettare prenotazioni
  notes text
);

-- Se hai già la tabella creata con 'not null', esegui questo comando di migrazione:
-- alter table public.appointments alter column price drop not null;

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
- **Linguaggio**: TypeScript
- **Stile**: Tailwind CSS
- **Icone**: Lucide React
- **Backend/DB**: Supabase (PostgreSQL)
- **Routing**: React Router Dom

## Note per lo Sviluppo Futuro
- Per trasformare in app desktop, è consigliato integrare **Electron** nel progetto (già predisposto come struttura React).
- Implementare autenticazione utente (Login parrucchiere) se necessario accedervi via internet.
