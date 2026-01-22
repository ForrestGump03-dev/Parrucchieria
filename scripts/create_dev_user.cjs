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
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Credenziali mancanti");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const email = 'admin@parrucchieria.it';
const password = 'password123';

async function createDevUser() {
  console.log(`👤 Tento di creare l'utente: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("❌ Errore creazione utente:", error.message);
  } else {
    // Check if user session (implies auto-confirm or login success) or user identity (implies creation success)
    if (data.user) {
        // Warning: identities might be an empty array if duplication
        if (data.user.identities && data.user.identities.length === 0) {
            console.log("⚠️ L'utente esiste già. Puoi effetuare il login con queste credenziali.");
        } else {
            console.log("✅ Utente creato o registrato!");
            console.log("⚠️ Importante: Se 'Email Confirmation' è abilitato nel tuo progetto Supabase, devi confermare la mail."); 
        }
    } else {
        console.log("❓ Stato incerto:", data);
    }
  }
}

createDevUser();
