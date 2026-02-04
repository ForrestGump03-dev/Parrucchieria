----------------------------------------------------------------
-- 1. Trova l'UUID del nuovo utente nella sezione Authentication
-- 2. Incollalo al posto di 'QUI-INCOLLA-L-ID-UTENTE' qui sotto
----------------------------------------------------------------

DO $$
DECLARE
    target_user UUID := 'QUI-INCOLLA-L-ID-UTENTE'; 
BEGIN
    INSERT INTO treatments (name, user_id) VALUES 
    
    
    ('Piega', target_user),
    ('Piega Stylist', target_user),
    ('Taglio', target_user),

    
    ('Ritocco Colore', target_user),
    ('Colore Intero', target_user),
    ('Decolorazione', target_user),
    ('Tonalizzante', target_user),
    
    
    ('Balayage', target_user),
    ('Meches', target_user),

    
    ('Riflessi', target_user),
    ('Permanente', target_user),
    ('Relax', target_user),
    ('Trattamento Keratina', target_user),

    
    ('Shampoo Specifico', target_user),
    ('Risrutturante', target_user);
    ('Acconciature', target_user);
    
END $$;