-- =============================================
-- EMERGENCY-CONTACT ACCOUNTS
-- Incremental patch to the live database. Apply like the other 99_updates patches.
-- =============================================
--
-- Feature: an emergency contact can be invited (by email) to create their OWN
-- account. When they sign up with the invited email, their account is tagged as
-- a distinct "emergency_contact" type and linked back to the inviting user.
--
--   * account_type       — 'patient' (default, unchanged for everyone today) or
--                          'emergency_contact'. They still use the patient app and
--                          get every feature; the SOS/Emergency Trigger is gated
--                          by live location (India-only) in the mobile app for ALL
--                          users, so this column does NOT gate SOS — it records the
--                          relationship/origin of the account.
--   * invited_by_user_id — the users.id of the person who added them as an
--                          emergency contact (nullable; null for normal signups).
--
-- Idempotent: safe to re-run.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_type       text NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid;

-- Constrain the allowed values (drop-then-add so re-runs don't error).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_type_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_account_type_check
  CHECK (account_type IN ('patient', 'emergency_contact'));

-- Link to the inviter (nullable). ON DELETE SET NULL so removing the inviter
-- never deletes the contact's own account.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_invited_by_user_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_invited_by_user_id_fkey
  FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by_user_id);

COMMENT ON COLUMN public.users.account_type IS 'patient (default) or emergency_contact — origin/relationship of the account; does NOT gate SOS.';
COMMENT ON COLUMN public.users.invited_by_user_id IS 'users.id of the person who invited this account as their emergency contact; null for normal signups.';

-- Rollback, if ever needed:
--   ALTER TABLE public.users DROP COLUMN invited_by_user_id;
--   ALTER TABLE public.users DROP COLUMN account_type;
