-- Add unique_code column if it doesn't exist
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS unique_code text;

-- Add a unique constraint per salon
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_unique_code_userid_key') THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_unique_code_userid_key UNIQUE (unique_code, user_id);
    END IF;
END $$;

-- Helper function to generate a random 6-character uppercase alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_unique_client_code(p_salon_id UUID) RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate 6 uppercase random characters (hexadecimal is enough)
    v_code := upper(substring(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.clients WHERE unique_code = v_code AND user_id = p_salon_id) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update the public_register_client function to generate and return unique_code
CREATE OR REPLACE FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_client_id UUID;
  v_matched_client RECORD;
  v_clean_phone TEXT;
  v_code TEXT;
BEGIN
  v_clean_phone := right(regexp_replace(p_phone, '\D', '', 'g'), 9);

  -- 1. Try to match by phone
  SELECT * INTO v_matched_client FROM public.clients 
  WHERE user_id = p_salon_id AND phone ILIKE '%' || v_clean_phone || '%';

  -- 2. Try to match by exact name if phone not found
  IF v_matched_client IS NULL THEN
    SELECT * INTO v_matched_client FROM public.clients 
    WHERE user_id = p_salon_id AND first_name ILIKE p_first_name AND last_name ILIKE p_last_name;
  END IF;

  IF v_matched_client IS NOT NULL THEN
    
    -- Check if it already has a unique code, if not generate one
    v_code := v_matched_client.unique_code;
    IF v_code IS NULL THEN
        v_code := public.generate_unique_client_code(p_salon_id);
    END IF;

    -- Update existing
    UPDATE public.clients
    SET 
      first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone,
      email = p_email,
      birth_date = p_birth_date,
      unique_code = v_code
    WHERE id = v_matched_client.id;
    
    RETURN json_build_object('status', 'updated', 'client_id', v_matched_client.id, 'unique_code', v_code);
  ELSE
    -- Generate new code
    v_code := public.generate_unique_client_code(p_salon_id);

    -- Insert new
    INSERT INTO public.clients (user_id, first_name, last_name, phone, email, birth_date, unique_code, total_visits, total_spent)
    VALUES (p_salon_id, p_first_name, p_last_name, p_phone, p_email, p_birth_date, v_code, 0, 0)
    RETURNING id INTO v_client_id;
    
    RETURN json_build_object('status', 'inserted', 'client_id', v_client_id, 'unique_code', v_code);
  END IF;
END;
$$;
