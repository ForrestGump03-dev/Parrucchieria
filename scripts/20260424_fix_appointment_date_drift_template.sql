-- Correzione manuale dei trattamenti confermati come errati dopo l'audit.
-- Non eseguire senza aver prima validato gli ID con il salone.
--
-- Istruzioni:
-- 1. Sostituisci gli ID nella clausola IN (...).
-- 2. Imposta la data corretta in corrected_date.
-- 3. Esegui prima la SELECT finale di verifica.

begin;

with target_rows as (
  select
    id,
    -- Sostituisci con la data corretta confermata manualmente.
    date '2026-04-24' as corrected_date
  from public.appointments
  where id in (
    '00000000-0000-0000-0000-000000000000'
  )
)
update public.appointments a
set date = t.corrected_date
from target_rows t
where a.id = t.id;

select
  id,
  client_id,
  treatment,
  date,
  created_at
from public.appointments
where id in (
  '00000000-0000-0000-0000-000000000000'
);

commit;
