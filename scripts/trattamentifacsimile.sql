----------------------------------------------------------------
-- 1. Trova l'UUID del nuovo utente nella sezione Authentication
-- 2. Incollalo al posto di 'QUI-INCOLLA-L-ID-UTENTE' qui sotto
----------------------------------------------------------------

DO $$
DECLARE
    target_user UUID := 'QUI-INCOLLA-L-ID-UTENTE'; 
BEGIN
    INSERT INTO treatments (name, user_id) VALUES 
    
    -- Sezione 1: Taglio e Piega
    ('Piega', target_user),
    ('Taglio', target_user),
    ('Taglio Uomo', target_user),

    -- Sezione 2: Colore
    ('Ritocco Colore', target_user),
    ('Colore Intero', target_user),
    ('Ombreggiature', target_user),
    ('Tonalizzante', target_user),

    -- Sezione 3: Schiariture
    ('Balayage Naturale', target_user),
    ('Balayage Californiano', target_user),

    -- Sezione 4: Cura e Trattamenti
    ('Illumina Shampoo (Kerastase)', target_user),
    ('Special Shampoo (L''Oreal S.E.)', target_user),
    ('Trattamento Olaplex SPA', target_user),
    ('Premier SPA', target_user),

    -- Sezione 5: Forme
    ('Permanente Riccio', target_user),
    ('Permanente Waves', target_user);
    
END $$;