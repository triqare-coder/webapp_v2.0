-- =============================================
-- FIX: false "Aadhar number already exists" when creating a driver with no Aadhar
-- Incremental patch to the live database. Apply like the other 99_updates patches.
-- =============================================
--
-- SYMPTOM (admin + transport "Add Driver")
--   Creating a 2nd (3rd, ...) driver while leaving the Aadhar field blank fails
--   with:  Error creating driver -> "Aadhar number already exists"
--   even though no Aadhar number was entered.
--
-- ROOT CAUSE
--   `drivers.aadhar_number` is OPTIONAL but UNIQUE. The app layer already coerces
--   a blank Aadhar to NULL on every write (services/driverService.ts
--   -> nullifyBlankUniques, and the CSV/debug insert paths use `|| null`). Under a
--   normal Postgres unique index NULLs are DISTINCT, so any number of drivers may
--   have no Aadhar. But the live constraint does NOT behave that way — a NULL (or
--   leftover '') Aadhar on the 2nd driver collides with the 1st. This happens when
--   the unique index was created as NULLS NOT DISTINCT (PG15+, permits only ONE
--   NULL row) and/or old rows were stored as '' before the app fix shipped.
--   The result is identical either way: a duplicate-key error on aadhar_number.
--
-- FIX (makes the DB match the "optional but unique" intent, independent of app code)
--   1) Normalize any stray '' / whitespace Aadhar values to NULL.
--   2) Drop whatever UNIQUE constraint/index currently sits on aadhar_number
--      (name-agnostic, so this works regardless of how it was originally created).
--   3) Recreate it as a PARTIAL unique index that only indexes non-NULL values.
--      Now unlimited drivers can have no Aadhar, while real Aadhar numbers stay
--      unique. NULLs are never compared, so NULLS NOT DISTINCT can't bite again.
--
-- Idempotent & safe to re-run. Touches no non-blank data. No app/APK change needed.
-- (App-side null coercion is already deployed; this makes the fix bulletproof.)
--
-- OPTIONAL pre-flight (read-only) — inspect the current index before applying:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname='public' AND tablename='drivers'
--     AND indexdef ILIKE '%aadhar_number%';

BEGIN;

-- 1) Blank / whitespace-only -> NULL
UPDATE public.drivers
   SET aadhar_number = NULL
 WHERE aadhar_number IS NOT NULL
   AND btrim(aadhar_number) = '';

-- 2) Drop any existing UNIQUE constraint or standalone unique index on aadhar_number
DO $$
DECLARE r record;
BEGIN
  -- 2a) unique CONSTRAINTS whose single key column is aadhar_number
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.drivers'::regclass
       AND c.contype  = 'u'
       AND c.conkey   = ARRAY[(
             SELECT a.attnum FROM pg_attribute a
              WHERE a.attrelid = 'public.drivers'::regclass
                AND a.attname  = 'aadhar_number'
           )]
  LOOP
    EXECUTE format('ALTER TABLE public.drivers DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- 2b) standalone unique INDEXES on aadhar_number not backing a constraint
  FOR r IN
    SELECT i.relname AS idxname
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
      JOIN pg_class t ON t.oid = x.indrelid
     WHERE t.relname = 'drivers'
       AND x.indisunique
       AND x.indnatts = 1
       AND (SELECT a.attname FROM pg_attribute a
             WHERE a.attrelid = t.oid AND a.attnum = x.indkey[0]) = 'aadhar_number'
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.idxname);
  END LOOP;
END $$;

-- 3) Recreate as a PARTIAL unique index that ignores NULLs entirely
CREATE UNIQUE INDEX IF NOT EXISTS drivers_aadhar_number_unique
    ON public.drivers (aadhar_number)
 WHERE aadhar_number IS NOT NULL;

COMMIT;
