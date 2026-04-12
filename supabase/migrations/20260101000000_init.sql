


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_id" "uuid", "quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.products
  set stock = stock - quantity
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."decrement_stock"("p_id" "uuid", "quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, status, current_period_end)
    VALUES (NEW.id, 'trialing', now() + interval '7 days');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_client_id UUID;
  v_matched_client RECORD;
  v_clean_phone TEXT;
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
    -- Update existing
    UPDATE public.clients
    SET 
      first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone,
      email = p_email,
      birth_date = p_birth_date
    WHERE id = v_matched_client.id;
    
    RETURN json_build_object('status', 'updated', 'client_id', v_matched_client.id);
  ELSE
    -- Insert new
    INSERT INTO public.clients (user_id, first_name, last_name, phone, email, birth_date, total_visits, total_spent)
    VALUES (p_salon_id, p_first_name, p_last_name, p_phone, p_email, p_birth_date, 0, 0)
    RETURNING id INTO v_client_id;
    
    RETURN json_build_object('status', 'inserted', 'client_id', v_client_id);
  END IF;
END;
$$;


ALTER FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_stats_from_appointment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_client_id uuid;
    new_visits int;
    new_spent numeric;
    new_last_visit date;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_client_id := OLD.client_id;
    ELSE
        target_client_id := NEW.client_id;
    END IF;

    IF target_client_id IS NOT NULL THEN
        SELECT 
            COUNT(DISTINCT a.date) as visits,
            COALESCE(SUM(
                a.price + 
                COALESCE((
                    SELECT SUM(COALESCE((elem->>'price')::numeric, 0) * COALESCE((elem->>'quantity')::numeric, 0))
                    FROM jsonb_array_elements(
                        CASE jsonb_typeof(a.products_sold)
                            WHEN 'array' THEN a.products_sold
                            ELSE '[]'::jsonb
                        END
                    ) AS elem
                ), 0)
            ), 0) as spent,
            MAX(a.date) as last_visit
        INTO
            new_visits,
            new_spent,
            new_last_visit
        FROM public.appointments a
        WHERE a.client_id = target_client_id AND a.price IS NOT NULL;

        UPDATE public.clients
        SET 
            total_visits = COALESCE(new_visits, 0),
            total_spent = COALESCE(new_spent, 0),
            last_visit = new_last_visit
        WHERE id = target_client_id;
    END IF;
    
    IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id AND OLD.client_id IS NOT NULL THEN
        SELECT 
            COUNT(DISTINCT a.date) as visits,
            COALESCE(SUM(
                a.price + 
                COALESCE((
                    SELECT SUM(COALESCE((elem->>'price')::numeric, 0) * COALESCE((elem->>'quantity')::numeric, 0))
                    FROM jsonb_array_elements(
                        CASE jsonb_typeof(a.products_sold)
                            WHEN 'array' THEN a.products_sold
                            ELSE '[]'::jsonb
                        END
                    ) AS elem
                ), 0)
            ), 0) as spent,
            MAX(a.date) as last_visit
        INTO
            new_visits,
            new_spent,
            new_last_visit
        FROM public.appointments a
        WHERE a.client_id = OLD.client_id AND a.price IS NOT NULL;

        UPDATE public.clients
        SET 
            total_visits = COALESCE(new_visits, 0),
            total_spent = COALESCE(new_spent, 0),
            last_visit = new_last_visit
        WHERE id = OLD.client_id;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_client_stats_from_appointment"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" "text",
    "treatment" "text" NOT NULL,
    "price" numeric,
    "notes" "text",
    "user_id" "uuid",
    "staff_id" "uuid",
    "duration" integer DEFAULT 30,
    "products_sold" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "birth_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "total_visits" integer DEFAULT 0 NOT NULL,
    "total_spent" numeric DEFAULT 0 NOT NULL,
    "last_visit" "date"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "brand" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "cost_price" numeric(10,2) DEFAULT 0,
    "stock" integer DEFAULT 0 NOT NULL,
    "min_stock" integer DEFAULT 5,
    "barcode" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "price_id" "text",
    "current_period_end" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."treatments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'Generale'::"text"
);


ALTER TABLE "public"."treatments" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_name_userid_key" UNIQUE ("name", "user_id");



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");



CREATE INDEX "appointments_staff_id_idx" ON "public"."appointments" USING "btree" ("staff_id");



CREATE INDEX "idx_appointments_userid" ON "public"."appointments" USING "btree" ("user_id");



CREATE INDEX "idx_clients_userid" ON "public"."clients" USING "btree" ("user_id");



CREATE INDEX "idx_treatments_userid" ON "public"."treatments" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_appointment_change_update_client_stats" AFTER INSERT OR DELETE OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_client_stats_from_appointment"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Gli utenti possono leggere il proprio abbonamento" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own appointments" ON "public"."appointments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own clients" ON "public"."clients" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own treatments" ON "public"."treatments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own products" ON "public"."products" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own staff" ON "public"."staff_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own appointments" ON "public"."appointments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own clients" ON "public"."clients" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own treatments" ON "public"."treatments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own products" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own staff" ON "public"."staff_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own appointments" ON "public"."appointments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own clients" ON "public"."clients" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own treatments" ON "public"."treatments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own products" ON "public"."products" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own staff" ON "public"."staff_members" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own appointments" ON "public"."appointments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own clients" ON "public"."clients" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own treatments" ON "public"."treatments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own products" ON "public"."products" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own staff" ON "public"."staff_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."treatments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."decrement_stock"("p_id" "uuid", "quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_id" "uuid", "quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_id" "uuid", "quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_register_client"("p_salon_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_email" "text", "p_birth_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_stats_from_appointment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_stats_from_appointment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_stats_from_appointment"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."treatments" TO "anon";
GRANT ALL ON TABLE "public"."treatments" TO "authenticated";
GRANT ALL ON TABLE "public"."treatments" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































