-- =============================================================================
-- FIX (2026-08-11): keep first_name / last_name filled for social sign-ins
--
-- WHY. App Review rejected iOS 2.0.2 (build 10) under Guideline 4: after signing
-- in with Apple, the app still made the reviewer type their name, even though
-- Apple had already given it to us.
--
-- It had. Apple's name arrives in auth.users.raw_user_meta_data as `full_name`
-- (verified live: both Apple accounts carry it), and handle_new_auth_user copies
-- it to public.users.full_name. But the metadata has no `first_name` /
-- `last_name` keys — Apple sends `full_name`, Google sends `given_name` /
-- `family_name` — so those two columns stayed NULL, and they are what the app and
-- the admin dashboard read. 16 of 79 live accounts are in that state: a name
-- captured and never shown.
--
-- The mobile app now backfills these columns itself at sign-in, so this file is
-- not a release blocker. Apply it so the same is true server-side, for accounts
-- created on the web and for the admin user list.
--
-- Idempotent + safe to re-run. Run in the Supabase SQL Editor (it must create a
-- trigger function on a table owned by the auth schema's role).
-- =============================================================================

-- 1. Provisioning trigger: derive first/last from whatever name shape the
--    provider used, instead of only looking for keys Apple and Google never send.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_user_meta   jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_app_meta    jsonb := coalesce(NEW.raw_app_meta_data,  '{}'::jsonb);
  v_role        text  := coalesce(v_app_meta->>'role', 'patient');
  v_first       text  := nullif(trim(coalesce(v_user_meta->>'first_name',
                                              v_user_meta->>'firstName',
                                              v_user_meta->>'given_name', '')), '');
  v_last        text  := nullif(trim(coalesce(v_user_meta->>'last_name',
                                              v_user_meta->>'lastName',
                                              v_user_meta->>'family_name', '')), '');
  v_full        text  := coalesce(
                           nullif(trim(coalesce(v_user_meta->>'full_name','')), ''),
                           nullif(trim(coalesce(v_user_meta->>'name','')), ''),
                           nullif(trim(coalesce(v_first,'') || ' ' || coalesce(v_last,'')), '')
                         );
BEGIN
  IF v_role NOT IN ('admin','ert','transport_company','patient','driver') THEN
    v_role := 'patient';
  END IF;

  -- A provider with no real name sometimes sends the email address in its place.
  -- Storing that would greet the user by their address and show it to responders.
  IF v_full LIKE '%@%' THEN
    v_full := NULL;
  END IF;

  -- Apple gives only a full name, so split it: first word is the first name, the
  -- rest (middle names included) is the last name.
  IF v_first IS NULL AND v_full IS NOT NULL THEN
    v_first := split_part(v_full, ' ', 1);
  END IF;
  IF v_last IS NULL AND v_full IS NOT NULL AND position(' ' in v_full) > 0 THEN
    v_last := trim(substring(v_full from position(' ' in v_full) + 1));
  END IF;

  SELECT id INTO v_existing_id
  FROM public.users
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- An existing profile keeps the name it already has; only blanks are filled.
    UPDATE public.users
       SET auth_user_id    = NEW.id,
           first_name      = coalesce(nullif(trim(coalesce(first_name,'')), ''), v_first),
           last_name       = coalesce(nullif(trim(coalesce(last_name,'')),  ''), v_last),
           full_name       = coalesce(nullif(trim(coalesce(full_name,'')),  ''), v_full),
           last_sign_in_at = now(),
           updated_at      = now()
     WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.users (id, auth_user_id, email, first_name, last_name, full_name, role, is_active)
    VALUES (NEW.id, NEW.id, NEW.email, v_first, v_last, v_full, v_role, true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Backfill the accounts already in this state: full_name stored, first/last
--    blank. Only blanks are written, so a name someone typed is never touched.
UPDATE public.users
   SET first_name = coalesce(nullif(trim(coalesce(first_name,'')), ''),
                             split_part(trim(full_name), ' ', 1)),
       last_name  = coalesce(nullif(trim(coalesce(last_name,'')), ''),
                             nullif(trim(substring(trim(full_name)
                                                   from position(' ' in trim(full_name)) + 1)), '')),
       updated_at = now()
 WHERE nullif(trim(coalesce(full_name,'')), '') IS NOT NULL
   AND full_name NOT LIKE '%@%'
   AND (nullif(trim(coalesce(first_name,'')), '') IS NULL
        OR nullif(trim(coalesce(last_name,'')), '') IS NULL);

-- 3. Second source for anyone whose users row has no name at all but whose auth
--    metadata does (an account created before the trigger read these keys).
UPDATE public.users u
   SET first_name = coalesce(u.first_name, split_part(m.name, ' ', 1)),
       last_name  = coalesce(u.last_name,
                             nullif(trim(substring(m.name from position(' ' in m.name) + 1)), '')),
       full_name  = coalesce(u.full_name, m.name),
       updated_at = now()
  FROM (
    SELECT au.id,
           nullif(trim(coalesce(au.raw_user_meta_data->>'full_name',
                                au.raw_user_meta_data->>'name',
                                trim(coalesce(au.raw_user_meta_data->>'given_name','') || ' ' ||
                                     coalesce(au.raw_user_meta_data->>'family_name','')))), '') AS name
      FROM auth.users au
  ) m
 WHERE u.auth_user_id = m.id
   AND m.name IS NOT NULL
   AND m.name NOT LIKE '%@%'
   AND nullif(trim(coalesce(u.full_name,'')), '') IS NULL;

-- 4. Verify: how many accounts still hold a full name with no first name?
--    Expected 0.
SELECT count(*) AS full_name_without_first_name
  FROM public.users
 WHERE nullif(trim(coalesce(full_name,'')), '') IS NOT NULL
   AND nullif(trim(coalesce(first_name,'')), '') IS NULL;
