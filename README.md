# Root Salon Manager v2.0.0

Il compagno digitale essenziale per la gestione moderna del tuo salone.

![Root Salon Manager](https://img.shields.io/badge/Versione-2.0.0-indigo) ![Status](https://img.shields.io/badge/Status-Stable-success) ![Platform](https://img.shields.io/badge/Platform-Windows-blue)

## 🌟 Novità della Versione 2.0 (Major Release)

### 🎨 Rebranding & Esperienza Utente

- **Nuova Identità**: Passaggio completo a **Root Salon Manager**.
- **Splash Screen**: Nuova schermata di caricamento animata all'avvio per un feedback visivo immediato.
- **Icone HD**: Aggiornamento grafico con icone ad alta risoluzione (512px) per una perfetta integrazione con Windows 10/11.
- **Interfaccia Pulita**: Ottimizzazioni visive nella Sidebar e nella pagina di Login.

### 🛡️ Centro di Sicurezza & Backup

- **Backup Locale Intelligente**: Nuova sezione dedicata per scaricare copie di sicurezza dei propri dati (Clienti e Storico) in formato CSV compatibile con Excel.
- **Esportazione Filtrata**: Le esportazioni rispettano rigorosamente la proprietà dei dati (RLS), garantendo che vengano scaricati solo i dati del proprio salone.
- **Promemoria Backup**: Sistema di notifica intelligente che ricorda di effettuare un backup ogni 14 giorni (logica "smart snooze": se ignorato, ricorda il giorno dopo; se fatto, aspetta 2 settimane).

### 🔔 Notifiche & Stabilità

- **Gestore Notifiche**: Nuovo motore di notifiche interno per avvisi di sistema e scadenze.
- **Fix Input Freezing**: Risolto un bug critico di Electron su Windows che causava il blocco dei campi di testo dopo aver utilizzato i dialog di salvataggio file.
- **Integrazione Windows**: Migliore gestione delle finestre e del focus applicazione.

---

## Funzionalità Core (Gia presenti)

### 🔐 Sicurezza & Cloud

- **Cloud Native**: Dati sincronizzati in tempo reale su Supabase.
- **Multi-Tenant**: Accesso sicuro con email/password, ogni salone ha il suo ambiente isolato.

### 📅 Agenda Smart

- **Visualizzazione Cluster**: Raggruppamento intelligente appuntamenti sovrapposti per evitare confusione.
- **Workflow Veloce**: Inserimento, modifica e spostamento appuntamenti con Drag & Drop.
- **Filtri Visivi**: Gli appuntamenti già pagati vengono archiviati visivamente per lasciare l'agenda pulita per le prenotazioni future.

### 👥 Clienti & Marketing

- **Anagrafica Completa**: Gestione dettagliata clienti con note tecniche.
- **Storico Trattamenti**: Cronologia completa di cosa ha fatto ogni cliente.

### 📊 Reportistica Avanzata

- **Analisi Finanziaria**: Dashboard con grafici e KPI in tempo reale (Fatturato Oggi/Mese/Anno).
- **Metriche di Crescita**: Confronto automatico con periodi precedenti.
- **Top Trattamenti**: Classifica dei servizi più venduti e redditizi.

---

## Stack Tecnologico

- **Frontend**: React 19, TypeScript, Tailwind CSS v4.
- **Desktop Engine**: Electron 40 (Secure Main Process).
- **Backend/DB**: Supabase (PostgreSQL + RLS Auth).
- **Build System**: Vite Typescript + Electron Builder.

## Installazione e Aggiornamento

1. Scaricare l'ultimo installer Root Setup 2.0.0.exe dalla cartella
   elease/.
2. Eseguire l'installazione (aggiornerà automaticamente la versione precedente mantenendo i dati di login).
3. Al primo avvio, godetevi la nuova Splash Screen!

## Sviluppo

npm run electron:dev

# Creazione pacchetto di distribuzione (.exe)

npm run electron:pack

---

*Developed by Alessio Forestieri*
