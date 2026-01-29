export const TREATMENTS = [
  // Design
  "Piega",
  "Taglio",
  "Taglio Uomo",

  // Cromia
  "Ritocco Colore",
  "Colore Intero",
  "Ombreggiature",
  "Tonalizzante",
  
  //Luminosità
  "Balayage Naturale",
  "Balayage Californiano",

  // Servizi Cura
  "Illumina Shampoo (Kerastase)",
  "Special Shampoo (L'Oreal S.E.)",
  "Trattamento Olaplex SPA",
  "Premier SPA",

  // Permanente
  "Permanente Riccio",
  "Permanente Waves"
] as const;

export type TreatmentType = typeof TREATMENTS[number];
