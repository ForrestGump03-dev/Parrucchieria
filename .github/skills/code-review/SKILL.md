---
name: code-review
description: "Esegue una revisione completa del codice: analisi statica TypeScript + ESLint, ricerca bug logici, race condition, memory leak, violazioni dei pattern del progetto (RLS Supabase, HashRouter, ConfirmModal, user_id in insert), best practice React 19, e sicurezza OWASP. Corregge automaticamente i problemi trovati e produce un report. Va eseguita PRIMA di update-instructions. Trigger: 'code review', 'revisione codice', 'controlla bug', 'risolvi problemi', 'analizza codice', 'esegui eslint', 'fix bug', 'code-review'."
argument-hint: "Opzionale: specifica un file, una cartella o una feature da analizzare. Senza argomento → revisione completa di src/"
---

# Skill: code-review

Esegue una revisione sistematica e **correttiva** del codice del progetto. Non si limita a segnalare i problemi: li risolve direttamente. Al termine produce un report sintetico e suggerisce di eseguire la skill `update-instructions` se sono stati modificati comportamenti o strutture.

---

## Quando Usarla

- Prima di un rilascio (build + distribuzione al cliente)
- Prima di eseguire `update-instructions` (il codice deve essere corretto prima di documentarlo)
- Dopo l'aggiunta di feature complesse o refactoring
- Quando si sospettano bug, memory leak o violazioni dei pattern
- Su richiesta esplicita di revisione / `eslint` / fix bug

---

## Ordine Consigliato con Altre Skill

```
code-review  →  (fix automatici)  →  update-instructions
```

La skill `update-instructions` documenta lo stato del codice: ha senso eseguirla solo dopo che il codice è stato revisionato e corretto.

---

## Procedura Completa

### FASE 0 — Analisi Statica Strumentale

Esegui i seguenti comandi **in sequenza** e salva tutto l'output per la fase successiva:

```bash
# 1. Errori TypeScript (non compila, solo analisi)
npx tsc --noEmit 2>&1

# 2. ESLint su tutta la cartella src/
npx eslint src/ --ext .ts,.tsx --format compact 2>&1

# 3. Controlla eventuali dipendenze vulnerabili
npm audit --audit-level=moderate 2>&1
```

> **Nota**: Se ESLint non è configurato o manca, leggi `eslint.config.js` per capire la configurazione attuale prima di procedere.

---

### FASE 1 — Raccolta Contesto

Leggi in parallelo i file che presentano errori nell'output di FASE 0, più questi file chiave:

- `src/types/index.ts` — tipi Supabase (fonte autoritativa schema DB)
- `src/App.tsx` — routing e guard autenticazione
- `src/layout/MainLayout.tsx` — layout principale
- `src/context/AuthContext.tsx` — hook `useAuth()`
- Tutti i file in `src/hooks/` che compaiono negli errori
- Tutti i file in `src/components/` che compaiono negli errori
- Tutti i file in `src/pages/` che compaiono negli errori

Se l'argomento della skill specifica un file o feature, concentra la lettura su quello.

---

### FASE 2 — Identificazione Problemi

Per ogni categoria, cataloga i problemi trovati con: **file**, **riga**, **descrizione**, **severità** (🔴 bloccante / 🟡 bug logico / 🟠 warning / 🔵 stile/best practice).

#### 2a. Errori TypeScript
- Tipi incompatibili
- `any` implicito (violazione strict mode)
- Proprietà inesistenti su interfacce
- Return type errato
- Import non risolti

#### 2b. Violazioni ESLint
- `react-hooks/exhaustive-deps` — dipendenze mancanti negli array di `useEffect`/`useMemo`/`useCallback`
- `react-hooks/rules-of-hooks` — hook chiamati condizionalmente
- `no-unused-vars` — variabili/import dichiarati ma non usati
- `no-console` — `console.log` dimenticati in produzione
- `@typescript-eslint/no-explicit-any` — uso esplicito di `any`

#### 2c. Bug Logici e Runtime
- **Race condition**: `useEffect` che aggiorna stato dopo che il componente è stato smontato → cleanup mancante con `AbortController` o flag `isMounted`
- **Memory leak**: `setInterval` / `setTimeout` senza `clearInterval`/`clearTimeout` nel return del `useEffect`
- **Closure stale**: `ref` non aggiornata dentro `setInterval` (pattern `settingsRef` già usato in `useReminders`)
- **Mutazione stato diretto**: array/oggetti modificati senza spread o copia
- **Promise non gestite**: `.then()` senza `.catch()`, `async` senza `try/catch`
- **Condizioni sempre vere/false**: guardie logiche ridondanti o impossibili
- **Dipendenze circolari**: import che si referenziano a vicenda

#### 2d. Violazioni Pattern Progetto

Questi pattern sono **obbligatori** per questo progetto. Segnala qualsiasi violazione:

| Pattern | Regola |
|---------|--------|
| **RLS Supabase** | Ogni `supabase.from(...).insert(...)` deve includere `user_id: user.id`. Senza questo la riga viene rifiutata silenziosamente dalla RLS |
| **Routing Electron** | Usare sempre `HashRouter`, mai `BrowserRouter` o `Navigate` con path assoluti senza `#` |
| **Dialoghi distruttivi** | Usare sempre `<ConfirmModal>`, mai `window.confirm()` o `window.alert()` |
| **Accesso utente** | Usare `const { user } = useAuth()`, mai chiamare `supabase.auth.getUser()` direttamente nei componenti |
| **Supabase nei componenti** | I componenti non devono chiamare `supabase` direttamente. Tutta la logica va in hook (`src/hooks/`) o context (`src/context/`) |
| **Toast** | Usare `react-hot-toast`. Il `<Toaster />` è montato una sola volta in `MainLayout` — non aggiungere istanze aggiuntive |
| **Asset Electron** | Path relativi (`'logo.png'`), mai path assoluti o con `/` iniziale |
| **Date** | `date-fns` con `{ locale: it }`, mai `moment.js` o `Date.toLocaleDateString()` senza locale |
| **Form** | `react-hook-form` + `zod` + `zodResolver`. No stato controllato manuale per i form |
| **Icone** | Solo `lucide-react`. Non usare altre librerie di icone |
| **CSS** | Solo classi Tailwind. Helper `cn()` da `src/lib/utils.ts` per classi condizionali |

#### 2e. Best Practice React 19
- Componenti che potrebbero beneficiare di `useMemo`/`useCallback` per evitare re-render inutili
- `key` prop assente o non univoca nelle liste
- Effetti che dovrebbero usare `useLayoutEffect` invece di `useEffect`
- Stato derivato calcolato nel render invece che con `useMemo`
- Props drilling eccessivo (>3 livelli) dove sarebbe meglio un context
- `useEffect` con logica di fetch che potrebbe essere sostituita da un hook dedicato

#### 2f. Sicurezza (OWASP Top 10)
- **Injection**: input utente concatenato in query Supabase senza parametrizzazione (Supabase usa query parametrizzate di default, ma verificare RPC personalizzate)
- **XSS**: `dangerouslySetInnerHTML` senza sanitizzazione
- **Credenziali esposte**: secrets hardcoded (chiavi API, password) — le variabili d'ambiente `VITE_*` vanno usate solo per dati non sensibili esposti al client
- **SSRF**: fetch verso URL costruiti da input utente
- **Auth bypass**: route non protette che dovrebbero richiedere autenticazione

---

### FASE 3 — Correzione Problemi

Risolvi i problemi nell'ordine di priorità:

1. 🔴 **Errori TypeScript bloccanti** — il progetto non compilerebbe
2. 🟡 **Bug logici** — race condition, memory leak, closure stale
3. 🔴 **Violazioni pattern progetto** — specialmente RLS e `window.confirm`
4. 🔴 **Vulnerabilità sicurezza**
5. 🟠 **Warning ESLint** — exhaustive-deps, unused vars, no-console
6. 🔵 **Best practice** — ottimizzazioni, refactoring leggero

**Regole di correzione**:
- Correggi solo ciò che è necessario — non refactorare codice funzionante solo per "pulizia"
- Non aggiungere feature non richieste
- Non aggiungere commenti o docstring dove non esistevano
- Per ogni correzione, verifica che non rompa altre parti del codice che dipendono dal file modificato
- Se una correzione richiede una decisione di design non ovvia, presenta le opzioni all'utente prima di procedere

---

### FASE 4 — Verifica Post-Fix

Dopo aver apportato tutte le correzioni, riesegui:

```bash
npx tsc --noEmit 2>&1
npx eslint src/ --ext .ts,.tsx --format compact 2>&1
```

Se compaiono nuovi errori introdotti dalle correzioni, risolvili prima di procedere al report.

---

### FASE 5 — Report Finale

Produci un report strutturato con:

```
## Report Code Review — [data]

### Problemi Trovati e Risolti
| # | File | Riga | Categoria | Descrizione | Azione |
|---|------|------|-----------|-------------|--------|
| 1 | ... | ... | 🔴 TypeScript | ... | Corretto |
...

### Problemi Segnalati (non corretti automaticamente)
Lista di problemi che richiedono decisione o intervento manuale, con spiegazione.

### Nessun Problema Trovato In
Lista delle categorie o file verificati senza problemi.

### Prossimi Passi Consigliati
- [ ] Eseguire `update-instructions` se sono stati modificati hook, componenti o logica di business
- [ ] Testare manualmente i flussi coinvolti dalle correzioni
- [ ] Eseguire `npm run electron:pack` per verificare la build finale
```

---

## Comportamento con Argomento Specifico

Se l'utente specifica un file o feature (`code-review src/hooks/useAppointments.ts`):

1. Esegui FASE 0 solo su quel file: `npx eslint src/hooks/useAppointments.ts --format compact`
2. Limita la lettura contesto al file specificato e alle sue dipendenze dirette
3. Esegui le fasi 2-4 solo su quel perimetro
4. Nel report, indica esplicitamente che la revisione è parziale

---

## Note Critiche sul Progetto

- **`price IS NULL` / `price IS NOT NULL`**: In `appointments`, `price = null` significa "prenotato" (Agenda), `price != null` significa "pagato" (Storico). Non confondere mai questi stati nelle query
- **`useReminders`**: Usa il pattern `settingsRef` per accedere allo stato aggiornato dentro `setInterval`. Non sostituire con lettura diretta dello stato — causerebbe closure stale
- **`StaffContext`**: Ri-fetcha i dati al focus della finestra Electron (`window.addEventListener('focus', ...)`). Verificare che il cleanup sia presente
- **`NotificationContext`**: Persiste in `localStorage`. Verificare che la deserializzazione gestisca dati corrotti (JSON.parse in try/catch)
- **Max 7 collaboratori**: Enforcement in `StaffManagerModal`. Se il limite viene spostato altrove, aggiornare le istruzioni
- **`products_sold`**: Campo JSONB in `appointments`. Validare sempre la struttura `{ id, name, price, quantity }[]` prima di usarlo
