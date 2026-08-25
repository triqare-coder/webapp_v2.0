-- Minimal stand-in for the live Triqare DB: only what hospital_dashboard.sql
-- touches, with the column set MEASURED live (not the drifted migration files).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Supabase provides this; tests set it via a GUC.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.auth_uid', true), '')::uuid $$;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE,
  first_name TEXT, last_name TEXT, full_name TEXT, phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient',
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- The pre-existing CHECK the migration must find, drop and widen.
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','ert','transport_company','patient','driver'));

CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hospital_type TEXT,
  address_line TEXT, phone TEXT NOT NULL DEFAULT '000',
  emergency_contact_person TEXT NOT NULL DEFAULT 'Reception',
  emergency_contact_phone TEXT NOT NULL DEFAULT '000',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.patients (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dob DATE, gender TEXT, blood_group TEXT, allergies TEXT, abha_id TEXT,
  insurance_provider TEXT, insurance_policy_number TEXT, insurance_valid_till DATE,
  primary_hospital_id UUID REFERENCES public.hospitals(id),
  secondary_hospital_id UUID REFERENCES public.hospitals(id),
  latitude NUMERIC, longitude NUMERIC, address_line TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Column set as measured live: NO created_at, NO destination_hospital_id,
-- NO estimated_arrival_time, NO assigned_driver_id.
CREATE TABLE public.sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'SOS Triggered',
  status_history JSONB,
  driver_id UUID,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  patient_name TEXT, patient_phone TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'PATIENT',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.configurations (
  key TEXT PRIMARY KEY, value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE PUBLICATION supabase_realtime;
