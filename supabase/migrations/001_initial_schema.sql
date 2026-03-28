-- ============================================================
-- JobBoost AI — Initial Schema Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- PROFILES TABLE
-- Maps to Clerk user. Clerk user ID = Supabase profile ID.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          text PRIMARY KEY,
  email       text NOT NULL,
  full_name   text,
  credits     integer NOT NULL DEFAULT 3,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- CVS TABLE
-- Stores uploaded CV files and parsed structured data.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cvs (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         text NOT NULL,
  original_name    text NOT NULL,
  storage_path    text NOT NULL DEFAULT '',
  parsed_text     text,
  structured_data jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cvs_user_id_idx ON public.cvs(user_id);
CREATE INDEX IF NOT EXISTS cvs_created_at_idx ON public.cvs(created_at DESC);

-- ============================================================
-- JOB_APPLICATIONS TABLE
-- Tracks each job application through the pipeline.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id                         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                    text NOT NULL,
  cv_id                      text,
  jd_text                    text,
  jd_url                     text,
  status                     text NOT NULL DEFAULT 'cv_uploaded'
                               CHECK (status IN (
                                 'cv_uploaded','jd_analyzed','pending_payment',
                                 'paid','generating','complete','failed'
                               )),
  stripe_payment_intent_id    text,
  paid_at                    timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS job_applications_updated_at ON public.job_applications;
CREATE TRIGGER job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS job_applications_user_id_idx ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS job_applications_status_idx ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS job_applications_created_at_idx ON public.job_applications(created_at DESC);

-- ============================================================
-- JOB_RESULTS TABLE
-- Stores all generated results after payment.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_results (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  application_id       text NOT NULL,
  cv_pdf_storage_path  text,
  company_report       jsonb,
  mock_interview_qa    jsonb,
  tech_prep           jsonb,
  generated_at         timestamptz
);

CREATE INDEX IF NOT EXISTS job_results_application_id_idx ON public.job_results(application_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Disabled for development — enable in production
-- ============================================================
ALTER TABLE public.profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_results       DISABLE ROW LEVEL SECURITY;
