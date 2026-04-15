-- Computed column function to extract month from birth_date as string
-- Allows PostgREST to filter clients by their birth month (e.g. eq('birth_month', '04'))
CREATE OR REPLACE FUNCTION public.birth_month(c public.clients) RETURNS text AS $$
  SELECT to_char(c.birth_date, 'MM')
$$ LANGUAGE SQL IMMUTABLE;
