---
name: update-instructions
description: "Aggiorna, modifica, integra o riscrive completamente il file copilot-instructions.md del progetto. Usa questa skill quando: si aggiungono nuove feature; si modificano hook, componenti, pagine, tipi o logica di business; si vuole sincronizzare le istruzioni con le ultime modifiche dei commit git; un collega non ha aggiornato la documentazione; si vuole riscrivere le istruzioni da zero con un livello di dettaglio esaustivo. Trigger: 'aggiorna istruzioni', 'update instructions', 'sincronizza copilot', 'documenta le modifiche', 'aggiorna copilot-instructions'."
argument-hint: "Descrivi cosa è cambiato, oppure lascia vuoto per analisi automatica dai commit git"
---

# Skill: update-instructions

Mantiene **`.github/copilot-instructions.md`** sempre aggiornato, preciso e completo, riflettendo lo stato reale del codice. È l'**unico file** che questa skill modifica.

---

## Quando Usarla

- Dopo aver aggiunto feature, componenti, pagine, hook o tipi
- Dopo modifiche alla logica di business o al DB (Supabase)
- Quando un collega ha fatto commit senza aggiornare le istruzioni
- Su richiesta esplicita di aggiornare / sincronizzare le istruzioni
- Per riscrivere le istruzioni da zero con massimo dettaglio

---

## Procedura Completa

### FASE 1 — Raccolta Contesto

Esegui **in parallelo**:

1. **Leggi il file corrente**:
   - Leggi `.github/copilot-instructions.md` per intero

2. **Analizza la struttura del progetto**:
   - Lista ricorsiva di `src/` (componenti, hook, pagine, contesti, tipi, lib)
   - Lista di `electron/` (main, preload)
   - Leggi `package.json` (dipendenze, script, versione)
   - Leggi `src/types/index.ts` (tipi Supabase — fonte autoritativa schema DB)
   - Leggi `vite.config.ts` e `tsconfig.app.json`

3. **Analizza i commit git recenti** (per rilevare modifiche non documentate):
   - Esegui: `git log --oneline -20` per vedere gli ultimi 20 commit
   - Per ogni commit non ancora riflesso nelle istruzioni, esegui:
     `git show --stat <hash>` per vedere i file modificati
   - Per file modificati rilevanti, leggi le differenze con:
     `git diff <hash>~1 <hash> -- <file>` oppure `git show <hash> -- <file>`

---

### FASE 2 — Analisi delle Differenze

Confronta ciò che hai raccolto con le istruzioni attuali. Identifica:

**Aggiunte** (presenti nel codice, mancanti nelle istruzioni):
- Nuovi componenti in `src/components/`
- Nuove pagine in `src/pages/`
- Nuovi hook in `src/hooks/`
- Nuovi tipi in `src/types/index.ts`
- Nuove dipendenze in `package.json`
- Nuove tabelle o colonne Supabase (da `src/types/index.ts`)
- Nuove rotte in `App.tsx` o `MainLayout.tsx`
- Nuova logica di business (checkout, storico, notifiche, ecc.)

**Modifiche** (codice cambiato rispetto a quanto descritto):
- Comportamento di hook esistenti
- Struttura componenti aggiornata
- Flussi utente modificati
- Versioni dipendenze aggiornate

**Rimozioni** (presenti nelle istruzioni, non più nel codice):
- File eliminati
- Feature deprecate
- Dipendenze rimosse

---

### FASE 3 — Lettura Approfondita dei File Rilevanti

Per ogni elemento identificato come nuovo o modificato, leggi il file corrispondente per estrarre:
- Firma delle funzioni/hook esportati
- Props dei componenti
- Struttura dei tipi Supabase
- Logica di business critica (condizioni, side effect, regole)
- Commenti significativi

**Priorità di lettura**:
1. `src/types/index.ts` — sempre, è la fonte autoritativa per lo schema DB
2. Hook modificati (`src/hooks/*.ts`)
3. Pagine nuove/modificate (`src/pages/*.tsx`)
4. Componenti nuovi/modificati (`src/components/*.tsx`)
5. Contesti (`src/context/*.tsx`)
6. `App.tsx`, `layout/MainLayout.tsx` per il routing
7. `electron/main.cjs` per IPC Electron
8. `src/lib/supabase.ts` per configurazione client

---

### FASE 4 — Aggiornamento delle Istruzioni

Applica le modifiche a `.github/copilot-instructions.md` seguendo le regole:

#### Regole di Editing

- **Aggiunte parziali**: Modifica solo le sezioni impattate, preserva il resto
- **Riscrittura completa**: Se le istruzioni sono molto disallineate o obsolete (>30% dei contenuti), riscrivi da zero seguendo la struttura in [structure-reference.md](./references/structure-reference.md)
- **Livello di dettaglio**: Massimo. Ogni hook deve documentare parametri ritornati, side effect, query Supabase eseguite. Ogni componente deve documentare props e comportamento. Ogni flusso deve essere documentato passo per passo
- **Lingua**: Italiano per testo descrittivo, inglese per nomi di codice (variabili, funzioni, tipi)
- **Formato tabelle**: Usa tabelle Markdown per elenchi di hook, componenti, tipi, colonne DB
- **RLS Supabase**: Sempre ricordare che le write richiedono `user_id: user.id` iniettato manualmente
- **Nessuna riduzione**: Non rimuovere dettagli esistenti corretti. Solo aggiungi, correggi o rimuovi se obsoleti

#### Struttura Target di `copilot-instructions.md`

Il file deve coprire queste sezioni, nell'ordine indicato. Adatta i contenuti allo stato reale del codice:

```
## 1. Panoramica del Progetto
   Nome, versione, scopo, piattaforma, utenti target

## 2. Stack Tecnologico
   Tabella: Libreria | Versione | Ruolo
   Fonte: package.json

## 3. Architettura e Flusso Dati
   - Struttura Electron (main / preload / renderer)
   - Supabase & RLS (CRITICO): letture auto-filtrate, scritture richiedono user_id
   - Pattern di fetching: hook dedicati, join con select('*, tabella(*)')

## 4. Schema Database / Tipi Supabase
   Fonte autoritativa: src/types/index.ts
   Per ogni tabella: colonne, tipo TS, nullable, note RLS
   Includere anche le interfacce TypeScript rilevanti

## 5. State Management
   Tabella Context: nome | file | cosa espone | dove usato
   Hook di accesso (useAuth, useNotifications, ecc.)

## 6. Hook Personalizzati
   Per ogni hook in src/hooks/:
   - Query Supabase eseguite
   - Tabella dei valori ritornati: nome | tipo | descrizione
   - Logica critica (condizioni, side effect, regole business)

## 7. Componenti
   Per ogni componente in src/components/:
   - Tabella props: nome | tipo | obbligatoria | descrizione
   - Comportamento e dipendenze

## 8. Pagine
   Per ogni pagina in src/pages/:
   - Rotta, hook consumati, feature principali

## 9. Flussi di Business Chiave
   Flussi end-to-end critici passo per passo:
   - Ciclo di vita appuntamento (booking → checkout → storico)
   - Ogni flusso importante aggiunto successivamente

## 10. Electron IPC
    Tabella canali: canale | direzione | descrizione
    Regola contextBridge

## 11. Developer Standards
    Convenzioni obbligatorie (styling, date, form, lingua, TypeScript, RLS)

## 12. Workflow Comuni
    Comandi dev/build e operazioni frequenti

## 13. File Chiave — Riferimento Rapido
    Tabella: file | ruolo
```

---

### FASE 5 — Verifica Finale

Dopo aver aggiornato il file:

1. Rileggi le sezioni modificate per coerenza
2. Verifica che i nomi di file, hook, componenti e tipi corrispondano esattamente al codice
3. Controlla che le versioni in "Stack Tecnologico" corrispondano a `package.json`
4. Assicurati che ogni tabella Supabase documentata corrisponda ai tipi in `src/types/index.ts`
5. Comunica all'utente un riepilogo delle modifiche apportate (sezioni aggiunte, modificate, rimosse)

---

## Comportamento in Caso di Commit di Colleghi

Se l'utente chiede di sincronizzare con i commit recenti senza specificare cosa è cambiato:

1. Esegui `git log --oneline --since="7 days ago"` (o l'intervallo indicato)
2. Per ogni commit, controlla i file modificati con `git show --stat <hash>`
3. Se i file modificati includono `src/`, `electron/`, `package.json` o tipi:
   - Leggi le differenze rilevanti
   - Identifica cosa è cambiato semanticamente (non solo sintatticamente)
4. Aggiorna le istruzioni di conseguenza
5. Segnala all'utente quali commit hanno introdotto modifiche non documentate e cosa è stato aggiornato

---

## Note Critiche sul Progetto

- **RLS Supabase**: Ogni `insert` deve includere `user_id: user.id`. Le `select` sono filtrate automaticamente. Mai dimenticare di documentare questo nei nuovi hook
- **Electron IPC**: Le interazioni renderer↔main passano per `electron/preload.cjs`. Documentare sempre i canali IPC aggiunti
- **Tipi**: `src/types/index.ts` è la **fonte autoritativa** per lo schema DB. Se cambia, aggiornare immediatamente la sezione "Schema Database / Tipi Supabase" nelle istruzioni
- **date-fns con locale `it`**: Sempre documentare l'uso corretto con locale italiano
- **react-big-calendar**: Documentare la logica di clustering se modificata

---

## Skill Correlata: code-review

Prima di aggiornare le istruzioni, è buona pratica eseguire la skill **`code-review`** per assicurarsi che il codice sia corretto, privo di bug e conforme ai pattern del progetto. Documentare codice difettoso consolida gli errori nelle istruzioni.

Ordine consigliato:
```
code-review  →  (fix automatici)  →  update-instructions
```
