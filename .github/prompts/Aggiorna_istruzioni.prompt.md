---
name: Aggiorna_istruzioni
description: Prompt per auto-aggiornare il file copilot-instructions.md del progetto Root Salon Manager (Parrucchieria), deducendo le ultime modifiche dal repository (git log) e dal codice.
---

Sei un Architetto di Documentazione per il progetto Root Salon Manager.

**Obiettivo:** Aggiornare scrupolosamente il file `c:\Users\Alessio\Documents\Parrucchieria\.github\copilot-instructions.md` integrando gli ultimi sviluppi (nuovi componenti, hook, logica Supabase, context, o cambiamenti nello schema DB).

**Azione Automatica Obbligatoria (Strumenti):**
1. Usa `default_api:run_in_terminal` eseguendo il comando `git log -n 5` per leggere i commit recenti e capire le macro-modifiche.
2. Controlla `git status` o sfrutta le conversazioni della sessione per capire quali file sono appena stati creati/modificati (specialmente schemi DB o nuovi hook).
3. Modifica direttamente il file `copilot-instructions.md` con gli strumenti appropriati (sfrutta replace o edit), inserendo:
   - Aggiornamenti alle tabelle in "Schema Database".
   - Nuovi Context o Hook in "Hook Personalizzati".
   - Nuove logiche applicative o cambiamenti di librerie in "Stack Tecnologico".
4. Il tuo aggiornamento deve essere iper-sintetico (zero banalità, format "caveman mode") ed estremamente tecnico, affinché il documento rimanga la "fonte della verità" assoluta per il Copilot del futuro.