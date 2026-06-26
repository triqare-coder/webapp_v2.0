-- =============================================
-- Add users.onboarding_completed
-- =============================================
-- Tracks whether a user has finished the one-time sign-up onboarding
-- (Terms & Conditions acceptance + initial profile / emergency-contact setup).
--
-- Behaviour:
--   * New sign-ups get FALSE (the column default) and are routed through the
--     Terms + setup flow once before reaching the app.
--   * All users that already exist when this migration runs are backfilled to
--     TRUE, so returning users are NEVER forced through onboarding again.
--
-- The mobile app reads this column defensively (treats a missing column / NULL
-- as "already onboarded"), so it is safe to ship the app before this runs — the
-- onboarding gate simply activates once the column exists.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Backfill: everyone who exists right now has already set up their account.
UPDATE public.users
SET onboarding_completed = true
WHERE onboarding_completed = false;

COMMENT ON COLUMN public.users.onboarding_completed IS
  'True once the user has completed the one-time sign-up onboarding (terms + initial setup). New users default to false; existing users were backfilled to true.';
