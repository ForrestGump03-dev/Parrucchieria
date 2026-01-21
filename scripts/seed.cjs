const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Caricamento manuale variabili d'ambiente (.env)
// Cerchiamo il file .env nella root del progetto
const envPath = path.resolve(__dirname, '../.env');
console.log(`📂 Leggo configurazione da: ${envPath}`);

let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envConfig = envFile.split('\n').reduce((acc, line) => {
    // Ignora commenti e linee vuote
    if (!line || line.startsWith('#')) return acc;
    
    // Split solo al primo '='
    const separatorIdx = line.indexOf('=');
    if (separatorIdx === -1) return acc;
    
    const key = line.substring(0, separatorIdx).trim();
    let val = line.substring(separatorIdx + 1).trim();
    
    // Rimuovi virgolette se presenti
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    
    acc[key] = val;
    return acc;
  }, {});
} catch (e) {
  console.error("❌ Impossibile leggere il file .env. Assicurati che esista nella root.");
  process.exit(1);
}

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Variabili VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti nel file .env");
  process.exit(1);
}

// 2. Inizializzazione Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Dati Mock
const CLIENTS_MOCK = [
  { first_name: 'Giulia', last_name: 'Bianchi', phone: '3331111111' },
  { first_name: 'Marco', last_name: 'Rossi', phone: '3332222222' },
  { first_name: 'Sofia', last_name: 'Verdi', phone: '3333333333' },
  { first_name: 'Alessandro', last_name: 'Neri', phone: '3334444444' },
  { first_name: 'Francesca', last_name: 'Esposito', phone: '3335555555' },
  { first_name: 'Lucia', last_name: 'Romano', phone: '3336666666' },
  { first_name: 'Matteo', last_name: 'Costa', phone: '3337777777' },
  { first_name: 'Chiara', last_name: 'Ricci', phone: '3338888888' },
];

const TREATMENTS_MOCK = [
  { name: 'Taglio Donna', price: 25 },
  { name: 'Taglio Uomo', price: 18 },
  { name: 'Piega', price: 15 },
  { name: 'Colore', price: 45 },
  { name: 'Shatush', price: 80 },
  { name: 'Trattamento Keratina', price: 35 }
];

// Helper per data casuale in un range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper per orario lavorativo casuale (09:00 - 18:00)
function randomTime() {
  const hour = Math.floor(Math.random() * (18 - 9 + 1) + 9);
  const min = Math.random() < 0.5 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
}

async function seed() {
  console.log("🌱 Inizio popolamento database...");

  // A. Inserimento Clienti (Gestione duplicati manuale)
  console.log("👥 Verifica/Creazione clienti...");
  
  // 1. Fetch esistenti
  const { data: existingClients, error: fetchError } = await supabase
    .from('clients')
    .select('phone, id');
    
  if (fetchError) {
    console.error("Errore fetch clienti:", fetchError);
    return;
  }

  const existingPhones = new Set(existingClients.map(c => c.phone));
  const newClients = CLIENTS_MOCK.filter(c => !existingPhones.has(c.phone));

  if (newClients.length > 0) {
     const { error: insertError } = await supabase.from('clients').insert(newClients);
     if (insertError) {
        console.error("Errore insert nuovi clienti:", insertError);
        return;
     }
     console.log(`✅ Aggiunti ${newClients.length} nuovi clienti.`);
  } else {
     console.log("ℹ️ Clienti mock già presenti.");
  }

  // 2. Ricarica tutti i clienti per avere gli ID
  const { data: allClients, error: reloadError } = await supabase.from('clients').select('*');
  if (reloadError || !allClients.length) {
     console.error("Impossibile recuperare clienti per generare appuntamenti");
     return;
  }
  
  const clients = allClients; // Use ONLY db clients


  // B. Generazione Appuntamenti
  const appointmentsPayload = [];
  const today = new Date();
  
  // Date Ranges
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);

  const TOTAL_APPOINTMENTS = 100;

  for (let i = 0; i < TOTAL_APPOINTMENTS; i++) {
    // Scegli client e trattamento random
    const client = clients[Math.floor(Math.random() * clients.length)];
    const treatment = TREATMENTS_MOCK[Math.floor(Math.random() * TREATMENTS_MOCK.length)];
    
    // Determina la data (distribuzione pesata)
    const rand = Math.random();
    let dateObj;

    if (i < 5) {
      // PRIMI 5: FORZIAMO A OGGI (Per testare Analisi Oggi)
      dateObj = today;
    } else if (rand < 0.45) {
      // 45% Questo mese (fino a oggi)
      dateObj = randomDate(startOfThisMonth, today);
    } else if (rand < 0.75) {
      // 30% Mese Scorso
      dateObj = randomDate(startOfLastMonth, endOfLastMonth);
    } else {
      // 25% Anno Scorso
      dateObj = randomDate(startOfLastYear, endOfLastYear);
    }

    // Aggiungi un po' di varianza al prezzo
    const finalPrice = treatment.price + (Math.random() > 0.8 ? 5 : 0); 

    appointmentsPayload.push({
      client_id: client.id,
      date: dateObj.toISOString().split('T')[0], // YYYY-MM-DD
      start_time: randomTime(),
      treatment: treatment.name,
      price: finalPrice // Prezzo definito -> conta come INCASSO (Cassa)
    });
  }

  // C. Inserimento Incassi
  console.log(`💰 Generazione ${appointmentsPayload.length} movimenti di cassa (Storico)...`);
  
  const { error: aptError } = await supabase
    .from('appointments')
    .insert(appointmentsPayload);

  if (aptError) {
    console.error("Errore inserimento incassi:", aptError);
  } else {
    console.log("✅ Database popolato con successo!");
    console.log("   - Clienti creati/aggiornati");
    console.log("   - INCASSI inseriti per: Oggi (5), Questo Mese, Mese Scorso, Anno Scorso");
  }
}

seed();
