-- Audit dei trattamenti potenzialmente salvati nel giorno sbagliato
-- a causa di conversioni UTC su appointments.date.
--
-- Uso:
-- 1. Esegui la query principale.
-- 2. Verifica i record sospetti con il salone.
-- 3. Correggi solo gli ID confermati usando lo script template separato.

with suspicious as (
  select
    a.id,
    a.user_id,
    a.client_id,
    a.treatment,
    a.date as stored_date,
    (a.created_at at time zone 'Europe/Rome') as created_at_rome,
    ((a.created_at at time zone 'Europe/Rome')::date) as created_local_date,
    (((a.created_at at time zone 'Europe/Rome')::date) - a.date) as day_shift
  from public.appointments a
  where
    a.price is not null
    and abs((((a.created_at at time zone 'Europe/Rome')::date) - a.date)) = 1
    and extract(hour from (a.created_at at time zone 'Europe/Rome')) between 0 and 3
)
select
  s.*,
  c.first_name,
  c.last_name,
  c.phone
from suspicious s
left join public.clients c on c.id = s.client_id
order by s.created_at_rome desc;
