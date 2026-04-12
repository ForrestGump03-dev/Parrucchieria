# Copilot Instructions — Root Salon Manager

## 1. Panoramica del Progetto

- **Nome**: Root Salon Manager (v3.0.0)
- **Scopo**: Gestionale per saloni di parrucchieri. Single-tenant (un account Supabase = un salone).
- **Piattaforma**: Semplice Web App React (Vite SPA). Backend Supabase (auth + DB + RLS).
- **Utenti**: Titolari/operatori del salone. Un solo utente per installazione.

---

## 2. Stack Tecnologico

| Libreria | Versione | Ruolo |
|----------|----------|-------|
| React | ^19.2.0 | UI framework |
| @supabase/supabase-js | ^2.90.1 | Backend BaaS (auth + DB) |
| Tailwind CSS | ^4.1.18 | Styling utility-first (Vite plugin) |
| TypeScript | ~5.9.3 | Linguaggio — strict mode |
| react-router-dom | ^7.12.0 | Routing (`BrowserRouter` per Web App) |
| react-helmet-async | ^3.0.0 | SEO e titoli dinamici per PWA |
| date-fns | ^4.1.0 | Date (locale `it` ovunque) |
| react-hook-form | ^7.71.1 | Gestione form |
| zod | ^4.3.5 | Schema validation |
| @hookform/resolvers | ^5.2.2 | Bridge zod ↔ react-hook-form |
| react-big-calendar | ^1.19.4 | Agenda/calendario |
| recharts | ^3.7.0 | Grafici in Reports |
| react-hot-toast | ^2.6.0 | Toast notifiche |
| lucide-react | ^0.562.0 | Icone |
| clsx + tailwind-merge | ^2.1.1 / ^3.4.0 | Utility classi CSS (`cn()`) |
| Vite | ^7.2.4 | Build tool / dev server |

---

## 3. Architettura e Flusso Dati

### Piattaforma Web (Rimozione Electron)
Tutte le dipendenze di Electron sono state rimosse. L'app è ora una SPA web-only progettata per essere hostata su piattaforme web standard come Vercel o Netlify.

### Edge Functions & Webhooks (Notifiche Telegram)
- Il progetto include Edge Functions scritte in **Deno** (nella cartella `supabase/functions/`).
- La logica SaaS/Stripe (precedentemente implementata) è stata del tutto **rimossa** a favore di una **Beta Aperta Gratuita**.
- La funzione `telegram-webhook` riceve in modo asincrono i Webhook dal database (es. `INSERT` su `auth.users` o `public.user_feedbacks`).
- **ATTENZIONE DEPLOY**: La funzione Edge deve usare le variabili d'ambiente fornite nei Secrets di Supabase. `npx supabase secrets set TELEGRAM_BOT_TOKEN="xxx" TELEGRAM_CHAT_ID="xxx"` e poi eseguire il deploy con `npx supabase functions deploy telegram-webhook`.
- Nessun pagamento o limitazione di prova è gestito o misurato nel sistema (Beta illimitata).

### Routing

Usa **`BrowserRouter`** nativo per permettere URL puliti ed essere compatibile con il deploy su Web / PWA.

| Path | Componente | Label sidebar |
|------|-----------|---------------|
| `/` | `<Agenda />` | Agenda |
| `/clients` | `<Clients />` | Clienti & Cassa |
| `/inventory` | `<Inventory />` | Magazzino |
| `/reports` | `<Reports />` | Report & Analisi |
| `/qr/:salonId` | `<PublicClientForm />` | Form Pubblico (Accesso QR) |
| `/marketing`| `<Marketing />` | Marketing & IA |
| `/login` | `<Login />` | — (solo se non autenticato) |

### Supabase & RLS (CRITICO)

- Tutte le tabelle hanno **Row Level Security** abilitata.
- **Letture**: filtrate automaticamente dal token Supabase dell'utente. Non serve filtro manuale per `user_id`.
- **Scritture**: iniettare **SEMPRE** `user_id: user.id` nel payload di ogni `insert`. Senza questo i dati non vengono salvati (RLS blocca la riga).
- **Form Pubblici e Utenti Anonimi (ANTI-IDOR)**: Poiché le policy RLS bloccano gli inserimenti/modifiche per il ruolo `anon`, la pagina di registrazione pubblica (QR Code) non invia query dirette via Supabase JS. Utilizza invece una **Postgres Function (`SECURITY DEFINER`)** chiamata `public_register_client` che il client invoca tramite `supabase.rpc()`. Questa funzione si occupa in sicurezza dell'Anti-Duplicati prima di effettuare operazioni di INSERT/UPDATE sicure bypassando l'RLS per gli utenti non loggati.
- **Accesso utente**: `const { user } = useAuth()` — non chiamare Supabase direttamente nei componenti.
- **Variabili d'ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel file `.env`. Il client è in `src/lib/supabase.ts`.

### Pattern di Fetching

- Tutta la logica Supabase è incapsulata in hook dedicati (`src/hooks/`) o context (`src/context/`).
- I componenti non chiamano mai `supabase` direttamente (eccezione tollerata: `Reports.tsx` per operazioni di seed dati di test).
- Join: `select('*, tabella_correlata(*)')` — es. `appointments` con `clients(*)` e `staff_members(*)`.
- Decremento stock prodotti via Supabase RPC: `supabase.rpc('decrement_stock', { p_id, quantity })`.

---

## 4. Schema Database / Tipi Supabase

> Fonte autoritativa: `src/types/index.ts`. Aggiornare immediatamente quando lo schema cambia.

### `clients`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `created_at` | `string` | No | ISO timestamp |
| `first_name` | `string` | No | |
| `last_name` | `string` | No | |
| `phone` | `string` | No | Usato per ricerca duplicati |
| `email` | `string` | Sì | |
| `birth_date` | `string` | Sì | Data di nascita |
| `is_active` | `boolean` | Sì | Per soft-delete |
| `is_vip` | `boolean` | Sì | Cliente VIP |
| `total_visits` | `number` | Sì | |
| `total_spent` | `number` | Sì | |
| `last_visit` | `string` | Sì | ISO timestamp |

### `appointments`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `created_at` | `string` | No | |
| `client_id` | `string` | No | FK → clients |
| `date` | `string` | No | `YYYY-MM-DD` |
| `start_time` | `string` | No | `HH:mm` |
| `treatment` | `string` | No | Nome servizio |
| `price` | `number \| null` | Sì | `null` = prenotato (Agenda); `!= null` = pagato (Storico) |
| `notes` | `string` | Sì | |
| `staff_id` | `string \| null` | Sì | FK → staff_members |
| `duration` | `number` | Sì | Minuti |
| `products_sold` | `ProductSold[]` | Sì | Prodotti venduti al checkout |
| — | — | — | Join fields: `clients?: Client`, `staff_members?: StaffMember` |

### `products`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `created_at` | `string` | No | |
| `user_id` | `string` | No | RLS — iniettare in insert |
| `name` | `string` | No | |
| `brand` | `string` | Sì | |
| `price` | `number` | No | Prezzo vendita |
| `cost_price` | `number` | Sì | Prezzo acquisto |
| `stock` | `number` | No | Quantità disponibile |
| `min_stock` | `number` | Sì | Soglia alert scorte basse |
| `barcode` | `string` | Sì | |

### `staff_members`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `user_id` | `string` | No | RLS |
| `name` | `string` | No | |
| `color` | `string` | Sì | Colore colonna agenda |
| `active` | `boolean` | No | Se false, non appare in agenda |

### `treatments`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `created_at` | `string` | Sì | |
| `name` | `string` | No | Unique per utente (errore 23505 se duplicato) |
| `category` | `string` | Sì | Default `'Generale'` |
| `user_id` | `string` | Sì | RLS |
| `price` | `number` | No | |
| `duration` | `number` | No | Minuti |

### `user_feedbacks`

| Colonna | Tipo TS | Nullable | Note |
|---------|---------|----------|------|
| `id` | `string` | No | UUID PK |
| `created_at` | `string` | No | Iso Timestamp |
| `user_id` | `string` | No | FK → auth.users. RLS policy: insert e view solo il proprio. |
| `type` | `string` | No | 'bug', 'idea', 'other' |
| `title` | `string` | No | Titolo breve |
| `description` | `string` | No | Testo completo del feedback |

### `subscriptions` *(Deprecata)*

La tabella esiste ancora a causa dei vecchi trigger di registrazione, ma i dati al suo interno non vengono più utilizzati per bloccare l'applicazione in quanto l'applicazione è entrata in fase Beta Gratuita limitless. Nessun blocco basato su Stripe o tier plan è in funzione.

### Tipi Ausiliari

```typescript
export type ProductSold = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'backup';

export interface AppNotification {
  id: string;          // crypto.randomUUID()
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: number;   // Date.now()
}

export type NewClient = Omit<Client, 'id' | 'created_at'>;
export type NewAppointment = Omit<Appointment, 'id' | 'created_at' | 'clients'>;

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 5. State Management

### Context API

| Context | File | Espone | Hook di accesso |
|---------|------|--------|-----------------|
| `AuthContext` | `src/context/AuthContext.tsx` | `user`, `session`, `loading`, `signOut()`, `updateUserPassword()`. Gestisce auto-logout inattività (60 m). Gestisce AAL2 MFA TOTP. | `useAuth()` |
| `NotificationContext` | `src/context/NotificationContext.tsx` | `notifications[]`, `unreadCount`, `addNotification()`, `markAsRead()`, `markAllAsRead()`, `removeNotification()`, `clearAll()` | `useNotifications()` |
| `StaffContext` | `src/context/StaffContext.tsx` | `staff[]`, `loading`, `addStaff()`, `updateStaff()`, `deleteStaff()`, `refreshStaff()` | `useStaff()` (re-export da `src/hooks/useStaff.ts`) |
| `TreatmentContext` | `src/context/TreatmentContext.tsx` | `treatments[]`, `loading`, `fetchTreatments()`, `addTreatment()`, `updateTreatment()`, `deleteTreatment()`, `seedDefaults()` | `useTreatments()` (re-export da `src/hooks/useTreatments.ts`) |

### Note sui Context

- **NotificationContext**: persiste in `localStorage` (`'app_notifications'`). Lo stato viene ricaricato al mount.
- **StaffContext**: ri-fetcha i dati quando la finestra del browser torna in focus (`window.addEventListener('focus', ...)`).
- **TreatmentContext**: `addTreatment` lancia errore con messaggio localizzato se il nome è duplicato (codice Supabase `23505`). `seedDefaults()` carica i trattamenti predefiniti da `src/constants/treatments.ts`.

---

## 6. Hook Personalizzati

### `useAppointments` (`src/hooks/useAppointments.ts`)

Logica Supabase per gli appuntamenti. Non mantiene stato locale — ogni metodo è un'operazione asincrona.

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `addAppointment` | `(appointment: NewAppointment) => Promise<Appointment>` | INSERT con `user_id: user.id`. Lancia errore se non autenticato. |
| `getClientHistory` | `(clientId: string) => Promise<Appointment[]>` | SELECT con condizione esatta `.not('price', 'is', null)` e ordinamento data DESC. |
| `getAppointmentsForRange` | `(start: Date, end: Date) => Promise<Appointment[]>` | Pre-formatta date (yyyy-MM-dd) tramite `date-fns`. SELECT con join `clients(*)` combinato con `.is('price', null)` (previene bug dei mille record e filtri data errati). |
| `deleteAppointment` | `(id: string) => Promise<void>` | DELETE per id. |
| `updateAppointment` | `(id: string, updates: Partial<NewAppointment>) => Promise<void>` | UPDATE campi parziali. |
| `getLastPriceForTreatment` | `(treatment: string) => Promise<number \| null>` | Recupera l'ultimo prezzo usato per un trattamento (price > 0, DESC created_at). Usato per pre-compilare il form. |
| `getClientAppointmentsByTime` | `(clientId, date, time) => Promise<Appointment[]>` | SELECT dove `price IS NULL` — appuntamenti in agenda allo stesso orario (stesso cliente). Usato per caricare tutti i servizi di una sessione in edit mode. |
| `loading` | `boolean` | Stato caricamento (solo per `addAppointment`). |

**Regola critica**: `price = null` → appuntamento in Agenda (prenotato). `price != null` → appuntamento pagato (Storico).

---

### `useClients` (`src/hooks/useClients.ts`)

Mantiene stato locale `clients[]` sincronizzato con Supabase.

| Valore/Metodo | Tipo | Descrizione |
|---------------|------|-------------|
| `clients` | `Client[]` | Lista clienti della pagina corrente. Caricata dal server tramite paginazione (`.range()`). |
| `totalCount` | `number` | Numero totale esatto dei clienti attivi, utile per la UI di paginazione. |
| `loading` | `boolean` | Stato caricamento iniziale o durante il fetch della pagina. |
| `error` | `string \| null` | Messaggio errore fetch. |
| `fetchClients(options)` | `Promise<void>` | Ri-fetcha da Supabase filtrando per `is_active = true`. Accetta opzioni `{ page, limit, search, sortOrder, activeTab }`. |
| `addClient(client)` | `Promise<Client>` | INSERT con `user_id: user.id`. Aggiorna stato locale ottimisticamente. |
| `updateClient(id, updates)` | `Promise<Client>` | UPDATE + aggiorna stato locale. |
| `deleteClient(id)` | `Promise<void>` | *Soft delete*: Imposta `is_active` a false. Verifica autenticazione come `addClient`. |
| `getClientByPhone(phone)` | `Promise<Client \| null>` | SELECT singolo per telefono. Filtra solo clienti attivi (`is_active = true`). |
| `findPotentialDuplicates(firstName, lastName)` | `Promise<Client[]>` | SELECT con `ilike` su nome/cognome. Filtra solo clienti attivi (`is_active = true`). |

---

### `useProducts` (`src/hooks/useProducts.ts`)

Mantiene stato locale `products[]`.

| Valore/Metodo | Tipo | Descrizione |
|---------------|------|-------------|
| `products` | `Product[]` | Lista prodotti ordinata per `name`. |
| `loading` | `boolean` | |
| `fetchProducts()` | `Promise<void>` | Ri-fetcha da Supabase. |
| `addProduct(product)` | `Promise<Product \| undefined>` | INSERT con `user_id: user.id`. Toast successo/errore automatici. |
| `updateProduct(id, updates)` | `Promise<void>` | UPDATE + aggiorna stato locale. Toast automatici. |
| `deleteProduct(id)` | `Promise<void>` | DELETE + filtra stato locale. Toast automatici. |
| `decrementStock(id, quantity)` | `Promise<void>` | Chiama RPC Supabase `decrement_stock({ p_id, quantity })`. Aggiorna stock locale ottimisticamente. |

---

### `useStats` (`src/hooks/useStats.ts`)

Calcola KPI aggregati dagli appuntamenti pagati.

**Tipi principali**:
```typescript
interface KPIStats {
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  periodRevenue: number;         // Ricavo nel range selezionato
  previousPeriodRevenue: number; // Ricavo nel periodo precedente (stesso delta)
  growth: number;                // % crescita rispetto al periodo precedente
  totalVisits: number;
  averageTicket: number;
  productRevenue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  topTreatments: TreatmentStat[];
  topClients: ClientStat[];
  sleepingClients: ClientStat[]; // Clienti senza visite recenti
  staffStats: StaffStat[];
  dailyTrend: DayTrend[];
}
type DateRange = { start: Date; end: Date; label: string };
```

| Valore/Metodo | Tipo | Descrizione |
|---------------|------|-------------|
| `stats` | `KPIStats \| null` | Null finché non si chiama `fetchStats`. |
| `loading` | `boolean` | |
| `fetchStats(customRange?)` | `Promise<void>` | Default: mese corrente. Calcola periodo precedente per confronto (stesso delta giorni). Fetcha solo appuntamenti con `price != null`. |

---

### `useDetailedReport` (`src/hooks/useDetailedReport.ts`)

Fetcha tutti gli appuntamenti pagati e costruisce una vista dettagliata per cliente, utile per il "Registro Dettagliato" in `Reports.tsx`.

**Tipi esposti**:
```typescript
interface ClientAppointmentDetail {
  id: string;
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:mm
  treatment: string;
  notes?: string;
  staffName: string;
  servicePrice: number;    // price dell'appuntamento
  productsRevenue: number; // somma (price × quantity) dei products_sold
  totalPrice: number;      // servicePrice + productsRevenue
  products: { name: string; quantity: number; price: number }[];
}

interface DetailedClientRow {
  clientId: string;
  clientName: string;
  phone: string;
  visits: number;           // visite nel range selezionato
  totalSpent: number;       // servizi + prodotti nel range
  servicesRevenue: number;
  productsRevenue: number;
  avgPerVisit: number;
  topTreatments: { name: string; count: number }[]; // max 3, per frequenza
  lastVisitDate: string;    // YYYY-MM-DD
  firstVisitDate: string;   // YYYY-MM-DD (nella finestra del range)
  lastStaff: string;
  isNewClient: boolean;     // true se non aveva MAI visitato prima di range.start
  appointments: ClientAppointmentDetail[]; // ordinati per data ASC
}

interface DetailedReportSummary {
  uniqueClients: number;
  totalVisits: number;
  totalRevenue: number;
  totalProductRevenue: number;
  avgTicket: number;
}

interface DetailedReportData {
  clients: DetailedClientRow[];
  summary: DetailedReportSummary;
}
```

| Valore/Metodo | Tipo | Descrizione |
|---------------|------|-------------|
| `data` | `DetailedReportData \| null` | Null finché non si chiama `fetchDetailedReport`. |
| `loading` | `boolean` | |
| `fetchDetailedReport(range)` | `Promise<void>` | Fetcha TUTTI gli appuntamenti pagati (`price IS NOT NULL`), filtra nel range, raggruppa per cliente. Determina `isNewClient` confrontando con visite precedenti al range. |

**Note**:
- Usa `supabase` direttamente (non tramite hook), come eccezione documentata.
- `isNewClient`: un cliente è considerato nuovo se non ha NESSUNA visita (pagata) anteriore a `range.start`.
- I typi sono riesportati da `useDetailedReport` e usati da `ClientDetailView`.

---

### `useReminders` (`src/hooks/useReminders.ts`)

Gestisce notifiche automatiche per appuntamenti imminenti e reminder backup.

```typescript
interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;    // Default: 15
  sound: boolean;
  checkInterval: number;     // Secondi, default: 60
  backupReminderEnabled: boolean;
  backupIntervalDays: number; // Default: 14 (Smart Snooze)
}
```

- Impostazioni persistite in `localStorage` (`'notificationSettings'`).
- Usa `settingsRef` + `notifiedIdsRef` per accedere allo stato aggiornato dentro `setInterval`.
- `sendNotification(title, body, type)`: invia sia a `NotificationContext` (centro notifiche) che a `react-hot-toast`.
- Espone `settings` e `updateSettings()`.

---

### `useStaff` e `useTreatments`

Semplici re-export dai rispettivi context:
- `useStaff()` → `StaffContext`
- `useTreatments()` → `TreatmentContext`

---

### `useWinback` (`src/hooks/useWinback.ts`)

Identifica candidati al "winback" — clienti la cui ultima visita risale a più di N giorni fa.

| Valore/Metodo | Tipo | Descrizione |
|---------------|------|-------------|
| `candidates` | `WinbackCandidate[]` | Clienti con ultima visita > `daysThreshold`. Ordinati per `days_since` DESC. |
| `loading` | `boolean` | |
| `refetch` | `() => Promise<void>` | Ri-fetcha i candidati. |

**Logica**:
- Fetcha tutti gli appuntamenti (`client_id`, `date`), raggruppa per cliente e trova la data più recente.
- Filtra i clienti la cui ultima visita è ≥ `daysThreshold` giorni fa (default: 60).
- Fetcha i dettagli dei clienti corrispondenti. Filtra solo clienti attivi (`is_active = true`).
- `WinbackCandidate` estende `Client` con `last_visit: string` e `days_since: number`.
- Usato nel tab "Recupero" di `ClientList`.

---

## 7. Componenti

### `AgendaModal` (`src/components/AgendaModal.tsx`)

Modale multi-step per creazione/modifica appuntamento dall'Agenda.

**Props**:
| Prop | Tipo | Obbligatoria | Descrizione |
|------|------|-------------|-------------|
| `isOpen` | `boolean` | Sì | |
| `onClose` | `() => void` | Sì | |
| `initialDate` | `Date \| null` | Sì | Data/ora slot cliccato |
| `initialStaffId` | `string` | No | Colonna staff cliccata |
| `appointmentToEdit` | `Appointment \| null` | No | Se presente → modalità modifica |
| `onSaved` | `() => void` | Sì | Callback dopo salvataggio (ri-fetcha eventi) |
| `onDeleteRequest` | `(clientId, clientName) => void` | No | Delega eliminazione cliente al parent |

**Step interni**: `'client'` → `'details'` → `'new-client'`

**Comportamento**:
- Step **client**: ricerca cliente + `findPotentialDuplicates` per alert nome identico.
- Step **details**: form multi-servizio (`ServiceItem[]`: `treatment`, `duration`, `staffId`). Usa `react-hook-form`.
- **Edit mode**: carica tutti i servizi della stessa sessione via `getClientAppointmentsByTime`.
- Include `TreatmentManagerModal` e `StaffManagerModal` aperti inline.
- `ConfirmModal` per conferma eliminazione appuntamento.

---

### `AppointmentForm` (`src/components/AppointmentForm.tsx`)

Form principale in Clienti & Cassa. Gestisce registrazione appuntamenti e checkout (incasso).

**Props**:
| Prop | Tipo | Obbligatoria | Descrizione |
|------|------|-------------|-------------|
| `selectedClient` | `Client` | No | Cliente selezionato dalla sidebar |
| `onClientUpdated` | `() => void` | Sì | Callback refresh lista clienti |
| `onSelectExistingClient` | `(client \| undefined) => void` | No | Seleziona cliente trovato per telefono |

**Comportamento**:
- **Rilevamento duplicati telefono**: debounce su `watch('phone')` → `getClientByPhone` → toast interattivo con button "Usa questo cliente".
- **Rilevamento duplicati al submit**: se durante il submit viene trovato un cliente con lo stesso telefono o nome/cognome, si apre un `ConfirmModal` (`duplicateConfirm` state) per chiedere se usare il cliente esistente. Su conferma → `onSelectExistingClient`. Su annullamento → il submit si interrompe.
- **Storico cliente**: `getClientHistory` → gruppi per data (accordion `expandedDates: Set<string>`).
- **Modifica dati cliente**: sezione inline con salva/annulla. Il pulsante "Annulla" ripristina tutti i campi (`first_name`, `last_name`, `phone`, `email`, `birth_date`) ai valori originali del `selectedClient`.
- **Checkout**: form unificato Servizi + Prodotti → INSERT con `price` non null → `decrementStock` per ogni prodotto.
- **Pre-compilazione prezzo**: `getLastPriceForTreatment` per suggerire l'ultimo prezzo usato.
- **Tipo prodotti**: `ProductItem.product` tipizzato come `{ id: string; name: string; price: number }`. I `products_sold` di ogni appuntamento usano `ProductSold[]`.

---

### `ClientDetailView` (`src/components/ClientDetailView.tsx`)

Vista full-screen del registro dettagliato clienti. Rimpiazza il render di `Reports.tsx` quando attivata.

**Props**:
| Prop | Tipo | Obbligatoria | Descrizione |
|------|------|-------------|-------------|
| `range` | `DateRange` | Sì | Range iniziale passato da `Reports`. Rinominato `initialRange` internamente. |
| `onClose` | `() => void` | Sì | Torna alla vista `Reports`. |

**Comportamento**:
- Ha un proprio selettore di periodo (Oggi/Settimana/Mese/Mese Scorso/Anno/Personalizzato) con stato `selectedRange` locale.
- Usa `useDetailedReport` per fetching e aggregazione dati.
- Tabella clienti ordinabile per `spent`, `name`, `visits`, `lastVisit` (`SortKey`).
- Ogni riga è espandibile (`ClientRow`): mostra sub-tabella con tutti gli appuntamenti del cliente nel periodo.
- Badge `RankBadge` per top 1/2/3 per spesa. Badge "Nuovo" per `isNewClient`.
- Avatar colorato deterministicamente (`getAvatarColor`) con le prime 2 iniziali del nome.
- Barra relativa di spesa per ogni cliente (rapporto con il massimo del periodo).
- Export CSV dei dati aggregati per cliente via `exportToCsv()`.
- **Colonne tabella**: Nome/Telefono, Badge, Visite, Trattamenti (top 3 pills), € Prodotti, Totale + media, Ultima Visita + staff, Espansione.
- **Sub-tabella espansa**: Data, Ora, Trattamento, Prodotti venduti, Staff, Note, € Serv., € Prod., Totale.

---

### `ConfirmModal` (`src/components/ConfirmModal.tsx`)

Modale conferma operazioni distruttive. Sostituisce `window.confirm()`.

**Props**: `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `confirmText` (default `'Conferma'`), `cancelText` (default `'Annulla'`), `isDanger` (default `false` → rosso se true).

---

### `ClientList` (`src/components/ClientList.tsx`)

Sidebar lista clienti con ricerca (nome, cognome, telefono), filtri (Compleanni del mese) e **Paginazione**.

**Feature:**
- Usa paginazione **server-side** passando i parametri al backend per limitare i re-render e risparmiare memoria, a chunk di 15.
- Supporta l'ordinamento Alfabetico (A-Z) o Recenti (`sortOrder`).
- Supporta i tab per filtrare (Tutti, Compleanni del mese, Winback).

**Props**: `onSelect`, `selectedClientId`, `onClientDeleted`, `refreshTrigger` (opzionale).

**Note**:
- `refreshTrigger`: prop numerico incrementato dal parent (`Clients.tsx`) per forzare un re-fetch della lista. Usato come dipendenza nel `useEffect` di fetching.

---

### `DeleteClientToast` (`src/components/DeleteClientToast.tsx`)

Toast con countdown per conferma eliminazione cliente dall'Agenda.

**Props**: `isVisible`, `clientName`, `onConfirm`, `onClose`, `duration` (default 5000ms). Auto-chiude dopo `duration` ms.

---

### `NotificationDrawer` (`src/components/NotificationDrawer.tsx`)

Drawer laterale (slide-in da destra). Usa `useNotifications()` per tutte le azioni. Backdrop con click per chiudere. Aperto da `MainLayout` tramite icona campana con badge `unreadCount`.

**Props**: `isOpen`, `onClose`.

---

### `SettingsModal` (`src/components/SettingsModal.tsx`)

Modale unificato per le impostazioni utente. Accessibile dalla sidebar. Include tre tab principali:
- **Sicurezza (2FA)**: Gestisce l'abilitazione (enrollment) e disabilitazione (unenrollment, protetta da rientro password) dell'autenticazione a due fattori TOTP (AAL2). Include banner per recupero in caso di dispositivo smarrito.
- **Notifiche**: Configurazione di `useReminders` (suoni, anticipo, backup reminder).
- **Password**: Cambio password.

**Props**: `isOpen`, `onClose`.

---

### `StaffManagerModal` (`src/components/StaffManagerModal.tsx`)

CRUD collaboratori. Limite: **max 7 collaboratori** (toast errore se superato). Usa `useStaff()`. `ConfirmModal` per eliminazione.

**Props**: `isOpen`, `onClose`.

---

### `TreatmentManagerModal` (`src/components/TreatmentManagerModal.tsx`)

CRUD listino trattamenti. Usa `useTreatments()`. Errore localizzato su nome duplicato (codice `23505`). `ConfirmModal` per eliminazione.

**Props**: `isOpen`, `onClose`.

---

### `ForgotPasswordModal` (`src/components/ForgotPasswordModal.tsx`)

Form a 2 step per il recupero della password: invio ed inserimento codice. Basato su OTP (codice di 6 cifre). Sostituisce i classici Magic Link per mitigare eventuali blocchi SMTP/Spam e per evitare l'intercettamento di eventi hash complessi (URL app) al rientro dal browser. Aperto da `Login`.

---

## 8. Pagine

### `Agenda` (`src/pages/Agenda.tsx`)

- **Rotta**: `/`
- **Hook**: `useAppointments`, `useClients`, `useStaff`
- **Libreria**: `react-big-calendar` con addon `withDragAndDrop` → `DnDCalendar`
- **Localizzazione**: `dateFnsLocalizer` con locale `it`
- **View default**: `Views.DAY`

**Feature**:
- **Colonne staff**: se ci sono staff attivi → una colonna per staff + colonna "Non assegnato". Se nessuno staff → vista standard.
- **Drag & Drop**: spostamento appuntamenti aggiorna `date`, `start_time`, `staff_id`.
- **Click slot**: apre `AgendaModal` (creazione) con data/ora/staff pre-compilati.
- **Click evento**: context menu con opzioni modifica/elimina.
- **Elimina appuntamento**: `ConfirmModal`.
- **Elimina cliente**: `DeleteClientToast` (countdown 5s).
- **Calcolo eventi**: `getAppointmentsForRange` al cambio data/view. `end` = `start_time` + `duration` minuti.

---

### `Clients` (`src/pages/Clients.tsx`)

- **Rotta**: `/clients`
- **Layout**: griglia 12 colonne — `ClientList` (3 col, sidebar) + `AppointmentForm` (9 col)
- **Pattern refreshTrigger**: `Clients.tsx` non istanzia più `useClients()`. Usa un counter `refreshTrigger` (incrementato da `triggerRefresh`) passato a `ClientList` come prop e ad `AppointmentForm` come `onClientUpdated`. Questo garantisce che quando il form crea un nuovo cliente o completa un checkout, la sidebar si ri-fetchi correttamente.
- **Flusso**: click cliente → `selectedClient` → `AppointmentForm` (storico + checkout)

---

### `Inventory` (`src/pages/Inventory.tsx`)

- **Rotta**: `/inventory`
- **Hook**: `useProducts`
- **Feature**: lista con ricerca (nome + brand), modal `ProductModal` (componente locale) per add/edit, `ConfirmModal` per delete, alert visivo per `stock <= min_stock`. Input numerici gestiti come `string | number` per evitare "0" automatico al focus.

---

### `Reports` (`src/pages/Reports.tsx`)

- **Rotta**: `/reports`
- **Hook**: `useStats`, `useAuth`
- **Libreria grafici**: `recharts` (LineChart trend giornaliero, BarChart confronti)
- **Feature**: filtro DateRange (Oggi/Settimana/Mese/Anno/custom), KPI cards con `growth` %, top trattamenti/clienti/staff, clienti dormienti, export CSV via `exportToCsv()` (solo dati utente corrente, RLS garantisce isolamento).
- **Registro Dettagliato**: pulsante "Registro Dettagliato →" → imposta `showDetailView = true` → render immediato di `<ClientDetailView range={selectedRange} onClose={...} />` (sostituisce il render standard della pagina). Chiusura tramite `onClose` ripristina la vista Reports.

---

### `Login` (`src/pages/Login.tsx`)

- **Rotta**: `/login` (redirect automatico se non autenticato)
- Autenticazione Supabase email + password. Apre `ForgotPasswordModal`.
- **2FA TOTP**: Intercetta la risposta di login. Se l'utente ha 2FA attiva (`mfa` richiede AAL2), sopprime il redirect immediato e mostra un form PIN nativo inline per verificare il TOTP (`mfa.challenge` + `mfa.verify`), bypassando la navigazione finché la sessione non è completata.

---

## 9. Flussi di Business Chiave

### Ciclo di Vita Appuntamento

| Stato | Condizione | Dove appare |
|-------|-----------|-------------|
| **Prenotato** | `price IS NULL` | Agenda |
| **Pagato/Completato** | `price IS NOT NULL` | Storico (Clienti & Cassa + Reports) |

**Flusso Checkout**:
1. Operatore seleziona cliente dalla sidebar in `Clients`.
2. Seleziona data, servizi (da `treatments`) e prodotti venduti (da `products`).
3. Imposta prezzo totale → submit.
4. `addAppointment({ ..., price: importo })` — price non null.
5. `decrementStock(id, quantity)` per ogni prodotto → RPC `decrement_stock`.
6. Appuntamento sparisce dall'Agenda, appare nello Storico.

### Colonne Staff in Agenda

- Staff attivi → colonne dedicate + colonna "Non assegnato".
- Nessuno staff → vista calendario standard.
- Max **7 collaboratori** (enforcement in `StaffManagerModal`).

### Sistema Notifiche & Backup Smart Snooze

- `useReminders` controlla a intervalli (`checkInterval` sec) gli appuntamenti imminenti entro `advanceMinutes` min.
- Reminder backup: ogni `backupIntervalDays` giorni (default 14) → notifica tipo `'backup'`.
- Notifiche → `NotificationContext` (persistite in `localStorage`) + toast visivo.
- Accesso dal `NotificationDrawer` (icona campana in `MainLayout`).

### Recupero Password (Nuovo Flusso OTP Manuale)

A causa di frequenti rate limit / blocchi SMTP di Supabase e filtri Spam:
1. `ForgotPasswordModal` → Supabase invia tramite mail (`resetPasswordForEmail`) un codice OTP numerico a 6 cifre.
2. L'utente incolla il codice a 6 cifre nello step successivo direttamente nella medesima finestra / modale dell'app.
3. L'app usa `verifyOtp({ type: 'recovery' })` seguito da un update della password. Nessun redirect critico, nessun intercettamento in `MainLayout` necessario.

---

## 10. Developer Standards

- **Routing**: Si può utilizzare sia `BrowserRouter` per build web standard che HashRouter. Attualmente configurato come PWA-friendly.
- **Styling**: Tailwind CSS v4, solo classi utility. Helper `cn()` in `src/lib/utils.ts`. Evitare file `.css` salvo `src/index.css` e `src/App.css`.
- **Date**: `date-fns` con locale `it` in tutti i `format()`, `parse()` e nel localizer del calendario. Mai `moment.js`.
- **Form**: `react-hook-form` + `zod` con `zodResolver`. Non usare stato controllato manuale per i form.
- **Toast**: `react-hot-toast`. Il `<Toaster />` è montato una sola volta in `MainLayout`. Non aggiungere istanze aggiuntive.
- **Icone**: `lucide-react` esclusivamente.
- **RLS**: ogni `insert` Supabase deve includere `user_id: user.id`.
- **TypeScript**: strict mode. Nessun `any` implicito.
- **Dialoghi distruttivi**: sempre `ConfirmModal`, mai `window.confirm()`.
- **Lingua**: italiano per tutti i testi UI, commenti e messaggi di commit.

---

## 11. Workflow Comuni

- **Dev**: `npm run dev` — avvia Vite su porta 5173.
- **Build**: `npm run build` — TypeScript build + Vite build per ambiente di produzione web.
- **Nuova tabella Supabase**: 1) interfaccia in `src/types/index.ts`, 2) hook in `src/hooks/`, 3) `user_id: user.id` in ogni insert.
- **Tipi DB**: aggiornare `src/types/index.ts` immediatamente ad ogni modifica dello schema.

---

## 12. File Chiave — Riferimento Rapido

| File | Ruolo |
|------|-------|
| `src/types/index.ts` | Tipi Supabase — **fonte autoritativa schema DB** |
| `src/App.tsx` | Routing (BrowserRouter, guard autenticazione) |
| `src/layout/MainLayout.tsx` | Sidebar, navigazione, campana notifiche, `PASSWORD_RECOVERY` listener |
| `src/lib/supabase.ts` | Client Supabase (da variabili d'ambiente `VITE_*`) |
| `src/lib/utils.ts` | `cn()` (classi CSS), `exportToCsv()` (download CSV) |
| `src/context/AuthContext.tsx` | Auth globale, auto-logout 60m, AAL2 middleware — `useAuth()` |
| `src/context/NotificationContext.tsx` | Centro notifiche in-app — `useNotifications()` |
| `src/context/StaffContext.tsx` | Gestione staff — `useStaff()` |
| `src/context/TreatmentContext.tsx` | Listino trattamenti — `useTreatments()` |
| `src/hooks/useAppointments.ts` | CRUD appuntamenti, logica price null/not-null |
| `src/hooks/useClients.ts` | CRUD clienti, rilevamento duplicati telefono/nome |
| `src/hooks/useProducts.ts` | CRUD prodotti, `decrementStock` via RPC |
| `src/hooks/useStats.ts` | KPI aggregati, confronto periodi, tipi statistiche |
| `src/hooks/useDetailedReport.ts` | Report dettagliato per cliente, `DetailedClientRow`, `DetailedReportData` |
| `src/hooks/useReminders.ts` | Reminder appuntamenti + backup Smart Snooze 14gg |
| `src/hooks/useWinback.ts` | Candidati winback — clienti con ultima visita > N giorni (default 60) |
| `src/pages/Agenda.tsx` | Calendario DnD con colonne staff, context menu, DnD |
| `src/pages/Clients.tsx` | Sidebar clienti + form checkout |
| `src/pages/Inventory.tsx` | Gestione magazzino prodotti |
| `src/pages/Reports.tsx` | KPI, grafici recharts, export CSV |
| `src/components/AgendaModal.tsx` | Modale multi-step prenotazione (client→details→new-client) |
| `src/components/AppointmentForm.tsx` | Form checkout + storico cliente raggruppato per data |
| `src/components/ClientDetailView.tsx` | Vista full-screen registro dettagliato clienti, espandibile per appuntamento |
| `src/components/ConfirmModal.tsx` | Modale conferma operazioni distruttive (`isDanger` → rosso) |
| `src/components/ClientList.tsx` | Sidebar lista clienti con ricerca |
| `src/components/StaffManagerModal.tsx` | CRUD staff (max 7) |
| `src/components/TreatmentManagerModal.tsx` | CRUD listino trattamenti |
| `src/components/SettingsModal.tsx` | Modale unificato impostazioni (2FA, Notifiche, Password) |
| `src/components/NotificationDrawer.tsx` | Drawer centro notifiche |
| `src/constants/treatments.ts` | Trattamenti predefiniti (seed DB) |
| `supabase/migrations/` | Migrazioni schema DB |
| `.github/copilot-instructions.md` | Questo file — aggiornare dopo ogni modifica significativa |