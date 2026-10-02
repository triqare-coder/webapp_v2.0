-- =============================================
-- QSoS Pro via Razorpay (web checkout at /patient/pro)
--
-- 1. One subscription row per Razorpay payment. The checkout callback and the
--    webhook both activate the same payment, usually within a second of each
--    other; this index makes that idempotent in the database rather than only
--    in application code. patient_subscriptions was empty when this was written.
-- 2. The two Pro plans the page sells. Prices are PLACEHOLDERS: change them in
--    Admin → Accounting → Subscription Plans (the page reads the table live).
--
-- Idempotent; safe to re-run. Apply in the Supabase SQL editor.
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS patient_subscriptions_transaction_id_key
  ON public.patient_subscriptions (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_history_razorpay_txn_key
  ON public.billing_history (transaction_id)
  WHERE payment_gateway = 'razorpay';

INSERT INTO public.subscription_plans (name, description, price, duration_days, is_active)
SELECT v.name, v.description, v.price, v.duration_days, true
FROM (VALUES
  ('QSoS Pro Monthly', 'Unlimited SOS, family members and live vitals — billed for 30 days', 499.00, 30),
  ('QSoS Pro Yearly',  'Everything in Pro for a full year — two months free',              4999.00, 365)
) AS v(name, description, price, duration_days)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans p WHERE p.name = v.name);
