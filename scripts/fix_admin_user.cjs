const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configurazione come in seed.cjs
const envPath = path.resolve(__dirname, '../.env');
console.log(`📂 Leggo configurazione da: ${envPath}`);

let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envConfig = envFile.split('\n').reduce((acc, line) => {
    if (!line || line.startsWith('#')) return acc;
    const separatorIdx = line.indexOf('=');
    if (separatorIdx === -1) return acc;
    const key = line.substring(0, separatorIdx).trim();
    let val = line.substring(separatorIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    acc[key] = val;
    return acc;
  }, {});
} catch (e) {
  console.error("❌ Impossibile leggere il file .env");
  process.exit(1);
}

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
// Try to find the service role key under common names
const SERVICE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ VITE_SUPABASE_URL mancante.");
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.log("⚠️  Nessuna Service Role Key trovata nel file .env (cerca SUPABASE_SERVICE_ROLE_KEY).");
  console.log("ℹ️  Non posso confermare automaticamente l'email dell'utente.");
  process.exit(0);
}

console.log("🔑 Service Role Key trovata! Tento di confermare l'utente admin.");

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = 'admin@parrucchieria.it';
const password = 'password123';

async function fixUser() {
  // 1. Cerca l'utente per ID (admin API) o tramite listUsers
   // Purtroppo listUsers non filtra per email facilmente senza ID, ma possiamo provare a creare con upsert o "admin.createUser" con email_confirm: true

   // Tentativo A: createUser con autoConfirm
   const { data, error } = await supabaseAdmin.auth.admin.createUser({
     email,
     password,
     email_confirm: true,
     user_metadata: { name: 'Admin Demo' }
   });

   if (error) {
     console.log(`ℹ️  createUser result: ${error.message}`);
     
     // Se l'utente esiste già, update user with verified email
     if (error.message.includes("already registered") || error.message.includes("exists")) {
        // Troviamo l'id? Non possiamo cercare per email direttamente via admin API facilmente in alcune versioni, 
        // ma possiamo provare a fare signIn per ottenere l'ID? No, update requires ID.
        // Usiamo listUsers
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
             console.error("❌ Errore listUsers:", listError);
             return;
        }

        const user = users.find(u => u.email === email);
        if (user) {
            console.log(`👤 Utente trovato (ID: ${user.id}). Aggiorno stato conferma...`);
            const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user.id,
                { email_confirm: true, password: password } // Reimposta password per sicurezza
            );
            
            if (updateError) {
                console.error("❌ Errore aggiornamento utente:", updateError);
            } else {
                console.log("✅ Utente confermato con successo! Ora puoi fare login.");
            }
        } else {
            console.log("❌ Utente non trovato nella lista.");
        }
     }
   } else {
     console.log("✅ Utente creato e confermato automaticamente!");
   }
}

fixUser();
