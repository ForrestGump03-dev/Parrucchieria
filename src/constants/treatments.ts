export const TREATMENTS = [
  "Taglio Donna",
  "Taglio Uomo",
  "Piega",
  "Colore Radice",
  "Colore Totale",
  "Meches / Colpi di Sole",
  "Balayage / Schiariture",
  "Tonalizzante",
  "Trattamento Ristrutturante",
  "Keratina",
  "Acconciatura",
  "Extension",
  "Barba",
  "Sopracciglia"
] as const;

export type TreatmentType = typeof TREATMENTS[number];
