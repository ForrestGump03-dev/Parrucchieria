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
| html5-qrcode | ^2.3.8 | Scansione codici a barre fotocamera |
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

### Email Transazionali (Resend SMTP)
- Le email di autenticazione (conferma registrazione, reset password) sono inviate tramite **Resend** come provider SMTP personalizzato.
- **Configurazione**: Supabase Dashboard → Authentication → Settings → SMTP Settings.
- **Dominio verificato**: `rootfix.app` (DNS configurato su Cloudflare con record MX, TXT, CNAME forniti da Resend).
- **Mittente**: `Root Salon Manager <noreply@rootfix.app>`.
- **Verifica email obbligatoria**: `Confirm email` è attivo — gli utenti devono cliccare il link nell'email prima di poter fare login.
- **Site URL**: configurato su `https://app.rootfix.app` in Supabase → Authentication → URL Configuration.
- **Template email**: personalizzati in italiano in Supabase → Authentication → Email Templates.

### Routing

Usa **`BrowserRouter`** nativo per permettere URL puliti ed essere compatibile con il deploy su Web / PWA.

| Path | Componente | Label sidebar |
|------|-----------|---------------|
| `/` | `<Agenda />` | Agenda |
| `/clients` | `<Clients />` | Clienti & Cassa |
| `/inventory` | `<Inventory />` | Magazzino |
| `/reports` | `<Reports />` | Report & Analisi |
| `/qr/:salonId` | `<PublicClientForm />` | Form Pubblico (Accesso QR) |
| `/login` | `<Login />` | — (solo se non autenticato) |

### Supabase & RLS (CRITICO)

- Tutte le tabelle hanno **Row Level Security** abilitata.
- **Letture**: filtrate automaticamente dal token Supabase dell'utente. Non serve filtro manuale per `user_id`.
- **Scritture**: iniettare **SEMPRE** `user_id: user.id` nel payload di ogni `insert`. Senza questo i dati non vengono salvati (RLS blocca la riga).
- **Form Pubblici e Utenti Anonimi (ANTI-IDOR)**: Poiché le policy RLS bloccano gli inserimenti/modifiche per il ruolo `anon`, la pagina di registrazione pubblica (QR Code) non invia query dirette via Supabase JS. Utilizza invece una **Postgres Function (`SECURITY DEFINER`)** chiamata `public_register_client` che il client invoca tramite `supabase.rpc()`. Questa funzione si occupa in sicurezza dell'Anti-Duplicati prima di effettuare operazioni di INSERT/UPDATE sicure bypassando l'RLS per gli utenti non loggati, e **genera e restituisce un Codice Cliente Univoco (`unique_code`)** da mostrare in Salone.
- **Accesso utente**: `const { user } = useAuth()` — non chiamare Supabase direttamente nei componenti.
- **Variabili d'ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel file `.env`. Il client è in `src/lib/supabase.ts`.

### Pattern di Fetching

- Tutta la logica Supabase è incapsulata in hook dedicati (`src/hooks/`) o context (`src/context/`).
- I componenti non chiamano mai `supabase` direttamente (eccezione tollerata: `Reports.tsx` per operazioni di seed dati di test).
- Join: `select('*, tabella_correlata(*)')` — es. `appointments` con `clients(*)` e `staff_members(*)`.
- Decremento stock prodotti via Supabase RPC: `supabase.rpc('decrement_stock', { p_id, quantity })`.
- **Limite 1000 righe Supabase**: Di default, le chiamate `.select()` di Supabase ritornano al massimo 1000 righe. Quando si devono scaricare tutti i record storici (es. in `useStats`, `useDetailedReport`, `useWinback`, `useAppointments` o nell'export/backup di `Reports.tsx`), è **OBBLIGATORIO** utilizzare un ciclo di paginazione con `.range(start, end)` unito al modifier `.order(..., { ascending: true/false })`. Questo previene il troncamento dei dati più recenti. Il limite delle 1000 righe scala senza problemi in Multi-Tenant perché le query sono filtrate alla base tramite RLS per il singolo salone.
- **Protezione dal Fallback Silenzioso a `anon` (`ensureAuthenticatedSession`)**: In `@supabase/supabase-js`, se il JWT scade (es. dopo standby/sleep del PC in salone) e il refresh fallisce per un errore transitorio di rete, `getSession()` restituisce `session: null` e il client ripiega silenziosamente sulla chiave `anon`, facendo restituire a PostgREST `data: []` (HTTP 200) per via dell'RLS. Tutti gli hook e context protetti da RLS devono invocare `await ensureAuthenticatedSession()` (`src/lib/supabase.ts`) prima delle query così da forzare il refresh o sollevare un'eccezione gestita senza mai sovrascrivere lo stato UI con array vuoti fittizi.
- **Gestione Concorrenza Auth e Prevenzione Deadlock**: Per evitare deadlock da rientranza, tempeste di re-fetch al cambio tab e warning/errori in console nel client GoTrue di Supabase (come `NavigatorLockAcquireTimeoutError`):
  1. Qualsiasi callback registrato su `supabase.auth.onAuthStateChange` che esegua ulteriori chiamate ad API di autenticazione (es. `getSession()`, controlli MFA / AAL) DEVE essere deferito tramite `setTimeout(() => { ... }, 0)`.
  2. Non sostituire il lock predefinito di Supabase: un lock custom deve rispettare integralmente il contratto della libreria e non può trasformare un lock non acquisito in un risultato valido. Per gli eventi che contengono già una sessione affidabile (`USER_UPDATED`, `TOKEN_REFRESHED`, e `SIGNED_IN` per il medesimo utente già autenticato), aggiornare lo stato React tramite `syncCurrentSession` preservando il riferimento di `user` (`isSameUser`) se i metadati non sono cambiati.
- **Verifica Password Amministratore (Stateless Fetch)**: La verifica della password dell'amministratore (sia per impostare/modificare/rimuovere il PIN del report sia per disabilitare la 2FA in `SettingsModal.tsx`) deve avvenire tramite `checkAdminPassword` (`src/hooks/useReportSecurity.ts`), che effettua una chiamata `fetch` diretta a `${supabaseUrl}/auth/v1/token?grant_type=password`. NON istanziare un secondo client `createClient` (provoca il warning `Multiple GoTrueClient instances`) e NON invocare `signInWithPassword` sul client principale (perché sovrascriverebbe i token di sessione, degraderebbe AAL2 ad AAL1 e attiverebbe listener `onAuthStateChange`).
- **Sistema di Protezione Fatturato Report (PIN, Rate-Limiting & Session Storage)**:
  - Cifre di fatturato, scontrino medio e grafici finanziari in `/reports` e `ClientDetailView` sono sfocati di default per privacy in salone.
  - Sblocco temporaneo tramite PIN a 6 cifre con hash SHA-256 e salt univoco salvato nei metadati dell'utente (`user.user_metadata.report_pin_hash`).
  - `ReportPinModal` applica un blocco anti-brute-force di 30 secondi dopo 5 tentativi errati consecutivi (`sessionStorage` key `root_report_pin_lockout`).
  - `ReportPinModal` e `ReportPinSetupModal` sono sempre montati a livello radice di `Reports.tsx` anche quando `showDetailView` (`ClientDetailView`) è attivo, e lo stato del periodo (`selectedRange`, `customDates`, `showCustomPicker`) è condiviso tra `Reports` e `ClientDetailView`.
  - La notifica di promemoria (quando nessun PIN è configurato) è limitata a **1 sola volta per sessione** tramite `sessionStorage.getItem('root_report_pin_reminder_shown')`, ripulita automaticamente al logout in `AuthContext.tsx` o alla chiusura del browser/spegnimento del computer.

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
| `unique_code` | `string` | Sì | Codice univoco cliente generato durante registrazione QR |
| `email` | `string` | Sì | |
| `birth_date` | `string` | Sì | Data di nascita |
| `birth_month`| `number` | Sì | Virtual/Computed column derivata da `birth_date` via SQL per ottimizzare filtri lato DB. |
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
| `barcode` | `string` | Sì | Codice a barre scansionabile (EAN/UPC) |

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
| `type` | `string` | No | 'bug' \| 'idea' \| 'other' |
| `title` | `string` | No | Titolo breve |
| `description` | `string` | No | Testo completo del feedback |

### `subscriptions` *(Deprecata)*

La tabella esiste ancora a causa dei vecchi trigger di registrazione, ma i dati al suo interno non vengono più utilizzati. L'interfaccia TS è marcata `@deprecated`. Nessun blocco basato su Stripe o tier plan è in funzione.

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
| `AuthContext` | `src/context/AuthContext.tsx` | `user`, `session`, `loading`, `signOut()`, `updateUserPassword()`. Gestisce auto-logout inattività (60 m), stabilizzazione del riferimento `user` (`isSameUser`), refresh proattivo token su evento `online` e verifica AAL2 MFA TOTP resiliente ad errori di rete. | `useAuth()` |
| `NotificationContext` | `src/context/NotificationContext.tsx` | `notifications[]`, `unreadCount`, `addNotification()`, `markAsRead()`, `markAllAsRead()`, `removeNotification()`, `clearAll()` | `useNotifications()` |
| `StaffContext` | `src/context/StaffContext.tsx` | `staff[]`, `loading`, `addStaff()`, `updateStaff()`, `deleteStaff()`, `refreshStaff()` | `useStaff()` (re-export da `src/hooks/useStaff.ts`) |
| `TreatmentContext` | `src/context/TreatmentContext.tsx` | `treatments[]`, `loading`, `fetchTreatments()`, `addTreatment()`, `updateTreatment()`, `deleteTreatment()`, `seedDefaults()` | `useTreatments()` (re-export da `src/hooks/useTreatments.ts`) |

### Note sui Context

- **AuthContext**: mantiene stabile il riferimento dell'oggetto `user` tramite `isSameUser(a, b)` durante `TOKEN_REFRESHED`, `USER_UPDATED` e `SIGNED_IN` per l'utente già autenticato (evitando re-render e tempeste di re-fetch negli hook dipendenti da `user`). Ascolta `window.addEventListener('online', ...)` per forzare il refresh del token dopo standby/sleep del PC. Al `signOut()` ripulisce `sessionStorage` (`root_report_pin_reminder_shown`, `root_report_pin_lockout`), `localStorage` (`app_notifications`) ed emette l'evento globale `'auth-signed-out'`.
- **NotificationContext**: persiste in `localStorage` (`'app_notifications'`) con lettura protetta da `try/catch` e limite massimo `MAX_NOTIFICATIONS = 100`. Si azzera automaticamente sull'evento `'auth-signed-out'`.
- **StaffContext**: invoca `ensureAuthenticatedSession()` prima del fetch e preserva lo stato `staff` esistente in caso di errore di rete transitorio. Il refresh su ritorno in focus/visibilità/online è coordinato e debounced (250ms) da `Agenda.tsx`.
- **TreatmentContext**: invoca `ensureAuthenticatedSession()` prima del fetch; `addTreatment` lancia errore con messaggio localizzato se il nome è duplicato (codice Supabase `23505`). `seedDefaults()` carica i trattamenti predefiniti da `src/constants/treatments.ts`.

---

## 6. Hook Personalizzati

### `useAppointments` (`src/hooks/useAppointments.ts`)

Logica Supabase per gli appuntamenti. Non mantiene stato locale — ogni metodo è un'operazione asincrona.

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `addAppointment` | `(appointment: NewAppointment) => Promise<Appointment>` | INSERT con `user_id: user.id`. Lancia errore se non autenticato. |
| `getClientHistory` | `(clientId: string) => Promise<Appointment[]>` | Invoca `ensureAuthenticatedSession()`, poi esegue SELECT paginata (`.range()` a blocchi di 1000) con condizione `.not('price', 'is', null)` e ordinamento `date` DESC, `start_time` DESC. |
| `getAppointmentsForRange` | `(start: Date, end: Date) => Promise<Appointment[]>` | Invoca `ensureAuthenticatedSession()`, pre-formatta date (`yyyy-MM-dd`) tramite `date-fns` ed esegue SELECT paginata (`.range()` a blocchi di 1000) con join `clients(*)` combinato con `.is('price', null)` e ordinamento deterministico (`date`, `start_time`, `id`). |
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
| `fetchClients(options)` | `Promise<void>` | Invoca `ensureAuthenticatedSession()`, protegge da race condition tramite `latestFetchRef` e ri-fetcha da Supabase filtrando per `is_active = true`. Accetta opzioni `{ page, limit, search, sortOrder, activeTab }`. La `search` sanitizza i caratteri speciali PostgREST (`,().%*"'\\`) prima di costruire il filtro `.or()` su nome, cognome, telefono o **`unique_code`**. Tab `birthdays` sfrutta `birth_month`. |
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
| `fetchProducts()` | `Promise<void>` | Invoca `ensureAuthenticatedSession()` e ri-fetcha da Supabase. |
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
| `fetchStats(customRange?)` | `Promise<void>` | Default: mese corrente. Invoca `ensureAuthenticatedSession()`, usa `latestFetchRef` contro race condition al cambio rapido del filtro, normalizza gli estremi con `startOfDay`/`endOfDay` e calcola il periodo precedente in modo DST-safe tramite `differenceInCalendarDays` + `addDays`. Se non esistono appuntamenti pagati, imposta comunque uno stato `KPIStats` a zero anziché lasciare `stats = null`. |

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
| `fetchDetailedReport(range)` | `Promise<void>` | Invoca `ensureAuthenticatedSession()`, protegge da race condition con `latestFetchRef`, fetcha TUTTI gli appuntamenti pagati (`price IS NOT NULL`) con paginazione `.range()`, filtra nel range normalizzato (`startOfDay`/`endOfDay`) e raggruppa per cliente. Se non ci sono record pagati, imposta `{ clients: [], summary: { ...0 } }`. |

**Note**:
- Usa `supabase` direttamente dentro l'hook con paginazione `.range()` e `ensureAuthenticatedSession()`.
- `isNewClient`: un cliente è considerato nuovo se non ha NESSUNA visita (pagata) anteriore a `range.start`.
- I tipi sono riesportati da `useDetailedReport` e usati da `ClientDetailView`.

---

### `useReminders` (`src/hooks/useReminders.ts`)

Gestisce notifiche automatiche per appuntamenti imminenti e reminder backup. Accetta `options?: { enablePolling?: boolean }` (default `true`).

```typescript
interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;    // Default: 15
  sound: boolean;
  checkInterval: number;     // Secondi, default: 60
  backupReminderEnabled: boolean;
  backupIntervalDays: number; // Default: 14 (Smart Snooze)
  winbackDays: number;        // Default: 60 (Soglia giorni recupero clienti)
}
```

- Impostazioni persistite in `localStorage` (`'notificationSettings'`) con parsing JSON protetto da `try/catch` e sincronizzazione cross-component tramite CustomEvent `'notification-settings-updated'`.
- Condivide a livello modulo il `Set` `notifiedAppointmentIds` (svuotato all'evento `'auth-signed-out'`) per evitare notifiche duplicate anche se l'hook viene rimontato; quando invocato solo per leggere le impostazioni (es. in `ClientList.tsx`), viene passato `{ enablePolling: false }` per non avviare timer ridondanti.
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
- Invoca `ensureAuthenticatedSession()` e protegge da race condition con `latestFetchRef`.
- Fetcha tutti gli appuntamenti (`client_id`, `date`) tramite ciclo paginato `.range()` (blocchi da 1000), raggruppa per cliente e trova la data più recente.
- Filtra i clienti la cui ultima visita è ≥ `daysThreshold` giorni di calendario fa (`differenceInCalendarDays`, default: 60).
- Fetcha i dettagli dei clienti corrispondenti suddividendo `.in('id', chunk)` in blocchi da 200 ID per evitare URL PostgREST troppo lunghi. Filtra solo clienti attivi (`is_active = true`).
- `WinbackCandidate` estende `Client` con `last_visit: string` e `days_since: number`.
- Usato nel tab "Recupero" di `ClientList`.

---

### `useReportSecurity` (`src/hooks/useReportSecurity.ts`)

Gestisce la sicurezza del fatturato in `Reports` tramite PIN a 6 cifre (hash SHA-256 con salt nei `user_metadata` di Supabase Auth) e verifica stateless della password amministratore.

- `checkAdminPassword(email, password)`: funzione esportata che verifica la password admin tramite `fetch` diretto a `${supabaseUrl}/auth/v1/token?grant_type=password` senza intaccare la sessione attiva né il livello AAL2 sul client principale.
- `useReportSecurity()`: espone `hasPin`, `skipPinSetup`, `verifyPin(pin)`, `setupPin(newPin, adminPassword?)`, `removePin(adminPassword)`, `setSkipSetup(skip)` e `triggerOpenSettings()`.

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

Vista full-screen del registro dettagliato clienti. Rimpiazza il render principale di `Reports.tsx` quando attivata, mantenendo sincronizzato lo stato del periodo e della protezione PIN con `Reports.tsx`.

**Props**:
| Prop | Tipo | Obbligatoria | Descrizione |
|------|------|-------------|-------------|
| `range` | `DateRange` | Sì | Range attivo sincronizzato con `Reports` (`selectedRange`). |
| `onRangeChange` | `(range: DateRange) => void` | Sì | Aggiorna `selectedRange` nel parent `Reports`. |
| `customDates` | `{ start: string; end: string }` | Sì | Estremi `yyyy-MM-dd` del filtro `Personalizzato`, condivisi con `Reports`. |
| `onCustomDatesChange` | `(dates: { start: string; end: string }) => void` | Sì | Aggiorna `customDates` nel parent `Reports`. |
| `showCustomPicker` | `boolean` | Sì | Stato visibilità selettore date personalizzate condiviso con `Reports`. |
| `onShowCustomPickerChange` | `(show: boolean) => void` | Sì | Aggiorna `showCustomPicker` nel parent `Reports`. |
| `onClose` | `() => void` | Sì | Torna alla vista `Reports`. |
| `isRevealed` | `boolean` | Sì | Indica se il fatturato è attualmente sbloccato/visibile. |
| `onToggleReveal` | `() => void` | Sì | Mostra/nasconde il fatturato o apre `ReportPinModal` / `ReportPinSetupModal` montati in `Reports.tsx`. |
| `onRequestUnlock` | `(action: () => void) => void` | Sì | Richiede lo sblocco tramite PIN prima di eseguire un'azione sensibile (es. export CSV). |

**Comportamento**:
- Condivide il selettore di periodo (Oggi/Settimana/Mese/Mese Scorso/Anno/Personalizzato) e le date custom (`customDates`, `showCustomPicker`) direttamente con `Reports.tsx`, evitando disallineamenti quando si passa tra Report e Registro Dettagliato.
- Usa `useDetailedReport` per fetching e aggregazione dati.
- Tabella clienti ordinabile per `spent`, `name`, `visits`, `lastVisit` (`SortKey`).
- Ogni riga è espandibile (`ClientRow`): mostra sub-tabella con tutti gli appuntamenti del cliente nel periodo.
- Badge `RankBadge` per top 1/2/3 per spesa. Badge "Nuovo" per `isNewClient`.
- Avatar colorato deterministicamente (`getAvatarColor`) con le prime 2 iniziali del nome.
- Barra relativa di spesa per ogni cliente (rapporto con il massimo del periodo).
- Export CSV dei dati aggregati per cliente via `exportToCsv()` (protetto da `onRequestUnlock` se il fatturato è nascosto).
- **Colonne tabella**: Nome/Telefono, Badge, Visite, Trattamenti (top 3 pills), € Prodotti, Totale + media, Ultima Visita + staff, Espansione.
- **Sub-tabella espansa**: Data, Ora, Trattamento, Prodotti venduti, Staff, Note, € Serv., € Prod., Totale.

---

### `ConfirmModal` (`src/components/ConfirmModal.tsx`)

Modale conferma operazioni distruttive. Sostituisce `window.confirm()`.

**Props**: `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `confirmText` (default `'Conferma'`), `cancelText` (default `'Annulla'`), `isDanger` (default `false` → rosso se true).

---

### `ClientList` (`src/components/ClientList.tsx`)

Sidebar lista clienti con ricerca (nome, cognome, telefono, `unique_code`), filtri (Compleanni del mese, Recupero/Winback) e **Paginazione**.

**Feature:**
- Usa paginazione **server-side** passando i parametri al backend per limitare i re-render e risparmiare memoria, a chunk di 15.
- Debounce di 250ms sulla ricerca (`debouncedSearch`) prima di interrogare Supabase, e filtro client-side immediato anche sul tab `winback`.
- Invoca `useReminders({ enablePolling: false })` per leggere `winbackDays` senza istanziare un secondo timer di polling.
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

Modale unificato per le impostazioni utente. Accessibile dalla sidebar o tramite l'evento globale `'open-settings-modal'` (`triggerOpenSettings()`). Include quattro aree principali:
- **Sicurezza (2FA & PIN Report)**: Gestisce l'abilitazione (enrollment con QR code renderizzato in modo sicuro tramite `<img src="data:image/svg+xml..." />`) e la disabilitazione dell'autenticazione a due fattori TOTP (AAL2, verificando la password tramite `checkAdminPassword` senza degradare la sessione AAL2), oltre alla configurazione, modifica o rimozione del **PIN di Sicurezza a 6 cifre per il fatturato Report** (protetta da password admin). Include banner per recupero 2FA.
- **Notifiche**: Configurazione di `useReminders` (suoni, anticipo, backup reminder, `winbackDays`).
- **Password**: Cambio password.
- **QR Code & Link Pubblico**: Generazione e stampa del QR Code per la registrazione pubblica dei clienti (`/qr/:salonId`). Link diretto copiabile e visualizzazione QR inline. Spostato qui dalla rimossa pagina Marketing.

**Props**: `isOpen`, `onClose`, `initialTab` (opzionale: `'notifications' | 'password' | 'qr' | 'security'`).

---

### `ReportPinModal` (`src/components/ReportPinModal.tsx`) e `ReportPinSetupModal` (`src/components/ReportPinSetupModal.tsx`)

- **`ReportPinModal`**: modale per l'inserimento del PIN a 6 cifre con rate-limiting anti-brute-force (blocco di 30 secondi dopo 5 tentativi falliti consecutivi persistito in `sessionStorage` sotto `root_report_pin_lockout`) e link rapido per modificare/recuperare il PIN in `SettingsModal`.
- **`ReportPinSetupModal`**: wizard di prima configurazione del PIN a 6 cifre con opzione "Salta per ora" (`skip_report_pin`).

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

### `FeedbackModal` (`src/components/FeedbackModal.tsx`)

Modale per l'invio di feedback da parte degli utenti della Beta. Accessibile dal pulsante "Invia Feedback" nella sidebar (`MainLayout`).

**Categorie**: `bug` (⚠ Problema), `idea` (💡 Nuova Idea), `other` (💬 Altro).

**Comportamento**:
- Form con selezione categoria (`type`), titolo e descrizione testuale.
- INSERT nella tabella `user_feedbacks` con `user_id: user.id`.
- Nessun upload di file/screenshot (per preservare il piano gratuito Supabase Storage).
- L'inserimento scatena un Database Webhook che invoca la Edge Function `telegram-webhook`, inviando una notifica in tempo reale al bot Telegram del titolare.

**Props**: `isOpen`, `onClose`.

---

## 8. Pagine

### `Agenda` (`src/pages/Agenda.tsx`)

- **Rotta**: `/`
- **Hook**: `useAppointments`, `useClients`, `useStaff`
- **Libreria**: `react-big-calendar` con addon `withDragAndDrop` → `DnDCalendar`
- **Localizzazione**: `dateFnsLocalizer` con locale `it`
- **View default**: `Views.DAY`

**Feature**:
- **Colonne staff**: se ci sono staff attivi → una colonna per staff + colonna "Non assegnato". Se nessuno staff → vista standard. Gli appuntamenti associati a collaboratori disattivati o rimossi vengono automaticamente riallocati nella colonna `'unassigned'` tramite `displayedEvents` (`useMemo`), così da non risultare mai invisibili.
- **Resilienza rete & Refresh su Focus/Online/Visibilità**: normalizza `start_time` (`HH:mm:ss` → `HH:mm`), protegge `fetchEvents` da race condition con `latestRequestRef`, preserva gli appuntamenti già visibili a schermo in caso di errore di rete effettuando fino a 2 retry automatici silenziosi (2s / 4s), e coordina un singolo listener debounced (250ms) su `focus`, `online` e `visibilitychange` che aggiorna sia `fetchEvents()` sia `refreshStaff()`.
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
- **Feature**: lista con ricerca (nome + brand + barcode), modal `ProductModal` (definito a livello modulo per preservare il focus degli input durante i re-render) per add/edit, `ConfirmModal` sia per eliminazione prodotto sia per conferma aggiornamento quantità su codice a barre duplicato, alert visivo per `stock <= min_stock`. Input numerici gestiti come `string | number` per evitare "0" automatico al focus.

---

### `Reports` (`src/pages/Reports.tsx`)

- **Rotta**: `/reports`
- **Hook**: `useStats`, `useAuth`, `useReportSecurity`
- **Libreria grafici**: `recharts` (LineChart trend giornaliero, BarChart confronti)
- **Feature**: filtro DateRange (Oggi/Settimana/Mese/Mese Scorso/Anno/Personalizzato), KPI cards con `growth` %, top trattamenti/clienti/staff, clienti dormienti, export CSV/Excel e Backup completo JSON/Excel paginati tramite `.range()` (a blocchi di 1000 record) e protetti da `ensureAuthenticatedSession()`.
- **Protezione Fatturato (PIN 6 Cifre)**: i dati economici (incassi, scontrino medio, ricavi prodotti, trend grafici e colonne Registro Dettagliato) sono sfocati all'avvio per privacy in salone. L'icona occhio ("Mostra"/"Nascondi") permette di sbloccarli tramite PIN di sicurezza a 6 cifre. `<ReportPinModal />` e `<ReportPinSetupModal />` sono renderizzati a livello radice di `Reports.tsx` anche quando `showDetailView` è attivo, così che lo sblocco del fatturato e l'export CSV funzionino identicamente sia nella vista principale sia dentro `ClientDetailView`.
- **Registro Dettagliato**: pulsante "Registro Dettagliato →" → imposta `showDetailView = true` → render di `<ClientDetailView />` condividendo `selectedRange`, `customDates`, `showCustomPicker` e lo stato di sblocco PIN con `Reports`.

---

### `Login` (`src/pages/Login.tsx`)

- **Rotta**: `/login` (redirect automatico se non autenticato)
- **Tab Login/Registrazione**: L'interfaccia include due tab. La tab "Accedi" gestisce il login con `supabase.auth.signInWithPassword()`. La tab "Registrati" permette la creazione di un nuovo account con `supabase.auth.signUp()`, abilitando l'auto-registrazione per la Beta Gratuita.
- **Errori Auth Localizzati**: Usa la funzione `translateAuthError` per fornire feedback in italiano sui requisiti della password (es. min. caratteri) o errori comuni definiti da Supabase.
- **Verifica email obbligatoria**: Dopo la registrazione, l'utente riceve un'email di conferma (via Resend SMTP). Senza cliccare il link di conferma, il login viene rifiutato da Supabase. Il messaggio post-registrazione invita a controllare l'email.
- Apre `ForgotPasswordModal` per il recupero password.
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
- **Date & Prevenzione "Date Drift"**: `date-fns` con locale `it` per tutti i `format()` e `parse()`. Mai `moment.js`. **Anti-Date Drift**: EVITARE ASSOLUTAMENTE costrutti come `new Date('2026-04-24T10:00')` per il parsing (causa glitch UTC vs Local time). Usa sempre: `parse('2026-04-24 10:00', 'yyyy-MM-dd HH:mm', new Date())`. Per calcolare delta tra date o periodi precedenti usare `differenceInCalendarDays` + `addDays` + `startOfDay`/`endOfDay` (DST-safe).
- **Form**: `react-hook-form` + `zod` con `zodResolver`. Non usare stato controllato manuale per i form.
- **Toast**: `react-hot-toast`. Il `<Toaster />` è montato una sola volta in `MainLayout`. Non aggiungere istanze aggiuntive.
- **Icone**: `lucide-react` esclusivamente.
- **RLS & Session Guard**: ogni `insert` Supabase deve includere `user_id: user.id`; ogni lettura protetta da RLS deve invocare `await ensureAuthenticatedSession()` (`src/lib/supabase.ts`) per impedire il fallback silenzioso al ruolo `anon`.
- **Sicurezza DOM & Export CSV**: vietato usare `dangerouslySetInnerHTML` o manipolazioni dirette `innerHTML`. L'esportazione CSV (`createCsvString` in `src/lib/utils.ts`) neutralizza automaticamente le formule Excel/CSV (`=`, `+`, `-`, `@`, `\t`, `\r`) contro attacchi CSV Formula Injection e rilascia gli Object URL con `URL.revokeObjectURL`.
- **TypeScript**: strict mode. Nessun `any` implicito. Types definiti in `src/types/index.ts`.
- **Dialoghi distruttivi**: sempre `ConfirmModal`, mai `window.confirm()`.
- **Lingua**: italiano per tutti i testi UI, commenti e messaggi di commit.
- **Agenti AI Custom**: Usa `@Reviewer` per il code review e il prompt `@workspace /Aggiorna_istruzioni` per auto-documentare i cambiamenti su questo file.

---

## 11. Hosting & Deploy

| Risorsa | Dominio | Piattaforma | Branch Git |
|---------|---------|-------------|------------|
| Landing Page | `rootfix.app` | Cloudflare Pages | `main` |
| App Gestionale | `app.rootfix.app` | Cloudflare Pages | `main` |
| Backend / DB | — | Supabase (progetto `hnzdualaqcqbnozvxrcb`) | — |
| Edge Functions | — | Supabase Edge Functions (Deno) | Deploy manuale via CLI |

### SEO
- **`sitemap.xml`** e **`robots.txt`** sono presenti in `landing-page/public/` (serviti su `rootfix.app`).
- La sitemap include `https://rootfix.app/` e `https://app.rootfix.app/login`.
- Le rotte protette dell'app (`/clients`, `/inventory`, ecc.) non sono nella sitemap perché richiedono autenticazione.
- Il link sitemap per Google Search Console è: `https://rootfix.app/sitemap.xml`.

### Deploy Edge Functions
```bash
npx supabase link --project-ref hnzdualaqcqbnozvxrcb
npx supabase secrets set TELEGRAM_BOT_TOKEN="xxx" TELEGRAM_CHAT_ID="xxx"
npx supabase functions deploy telegram-webhook
```

---

## 12. Workflow Comuni

- **Dev**: `npm run dev` — avvia Vite su porta 5173.
- **Build**: `npm run build` — TypeScript build + Vite build per ambiente di produzione web.
- **Nuova tabella Supabase**: 1) interfaccia in `src/types/index.ts`, 2) hook in `src/hooks/`, 3) `user_id: user.id` in ogni insert.
- **Tipi DB**: aggiornare `src/types/index.ts` immediatamente ad ogni modifica dello schema.

---

## 13. File Chiave — Riferimento Rapido

| File | Ruolo |
|------|-------|
| `src/types/index.ts` | Tipi Supabase — **fonte autoritativa schema DB** |
| `src/App.tsx` | Routing (BrowserRouter, guard autenticazione) |
| `src/layout/MainLayout.tsx` | Sidebar, navigazione, campana notifiche, listener `'open-settings-modal'`, fallback logo React state |
| `src/lib/supabase.ts` | Client Supabase (da variabili d'ambiente `VITE_*`) + helper `ensureAuthenticatedSession()` |
| `src/lib/utils.ts` | `cn()` (classi CSS), `createCsvString()` (con protezione CSV Formula Injection), `exportToCsv()` |
| `src/context/AuthContext.tsx` | Auth globale, auto-logout 60m, stabilizzazione `user`, refresh `online`, AAL2 middleware — `useAuth()` |
| `src/context/NotificationContext.tsx` | Centro notifiche in-app (cap 100 notifiche, cleanup al logout) — `useNotifications()` |
| `src/context/StaffContext.tsx` | Gestione staff — `useStaff()` |
| `src/context/TreatmentContext.tsx` | Listino trattamenti — `useTreatments()` |
| `src/hooks/useAppointments.ts` | CRUD appuntamenti paginati (`.range()`), logica price null/not-null |
| `src/hooks/useClients.ts` | CRUD clienti paginati, sanitizzazione filtri PostgREST `.or()`, rilevamento duplicati |
| `src/hooks/useProducts.ts` | CRUD prodotti, `decrementStock` via RPC |
| `src/hooks/useStats.ts` | KPI aggregati DST-safe, confronto periodi, tipi statistiche |
| `src/hooks/useDetailedReport.ts` | Report dettagliato per cliente, `DetailedClientRow`, `DetailedReportData` |
| `src/hooks/useReminders.ts` | Reminder appuntamenti + backup Smart Snooze 14gg + opzione `{ enablePolling }` |
| `src/hooks/useWinback.ts` | Candidati winback paginati e chunked — clienti con ultima visita > N giorni (default 60) |
| `src/hooks/useReportSecurity.ts` | Gestione hash SHA-256 PIN a 6 cifre, skip flag e `checkAdminPassword` stateless |
| `src/pages/Agenda.tsx` | Calendario DnD con colonne staff, fallback `'unassigned'`, retry automatico e refresh debounced |
| `src/pages/Clients.tsx` | Sidebar clienti + form checkout |
| `src/pages/Inventory.tsx` | Gestione magazzino prodotti con `ProductModal` top-level e `ConfirmModal` |
| `src/pages/Reports.tsx` | KPI, grafici recharts, export/backup paginati, protezione PIN condivisa con `ClientDetailView` |
| `src/components/AgendaModal.tsx` | Modale multi-step prenotazione (client→details→new-client) |
| `src/components/AppointmentForm.tsx` | Form checkout + storico cliente raggruppato per data |
| `src/components/ClientDetailView.tsx` | Vista full-screen registro dettagliato clienti sincronizzata con `Reports` |
| `src/components/ConfirmModal.tsx` | Modale conferma operazioni distruttive (`isDanger` → rosso) |
| `src/components/ClientList.tsx` | Sidebar lista clienti con ricerca debounced (250ms), filtro compleanni e winback |
| `src/components/BarcodeScanner.tsx` | Scansione tramite fotocamera (libreria `html5-qrcode`) |
| `src/components/StaffManagerModal.tsx` | CRUD staff (max 7) |
| `src/components/TreatmentManagerModal.tsx` | CRUD listino trattamenti |
| `src/components/SettingsModal.tsx` | Modale unificato impostazioni (2FA, PIN Report, Notifiche, Password, QR Code) |
| `src/components/ReportPinModal.tsx` | Modale inserimento PIN a 6 cifre con lockout anti-brute-force (5 tentativi / 30s) |
| `src/components/ReportPinSetupModal.tsx` | Modale prima configurazione PIN con opzione Salta per ora |
| `src/components/FeedbackModal.tsx` | Modale invio feedback categorizzato (bug/idea/altro) → notifica Telegram |
| `src/components/NotificationDrawer.tsx` | Drawer centro notifiche |
| `src/constants/treatments.ts` | Trattamenti predefiniti (seed DB) |
| `supabase/functions/telegram-webhook/index.ts` | Edge Function per notifiche Telegram (nuovi utenti + feedback) |
| `supabase/migrations/` | Migrazioni schema DB |
| `landing-page/public/sitemap.xml` | Sitemap per Google Search Console (`rootfix.app`) |
| `landing-page/public/robots.txt` | Robots.txt per crawler (`rootfix.app`) |
| `.github/agents/Reviewer.agent.md` | Custum Agent Copilot (Checklist PR / RLS DB / UI best practice) |
| `.github/prompts/Aggiorna_istruzioni.prompt.md` | Prompt Copilot per agg. documentazione post commit |
| `.github/copilot-instructions.md` | Questo file — aggiornare dopo ogni modifica significativa |
