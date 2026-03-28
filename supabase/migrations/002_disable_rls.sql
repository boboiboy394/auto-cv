-- Disable all RLS and policies for development
-- Run in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "cvs_select_policy" ON public.cvs;
DROP POLICY IF EXISTS "cvs_insert_policy" ON public.cvs;
DROP POLICY IF EXISTS "cvs_update_policy" ON public.cvs;
DROP POLICY IF EXISTS "cvs_delete_policy" ON public.cvs;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "job_applications_select_policy" ON public.job_applications;
DROP POLICY IF EXISTS "job_applications_insert_policy" ON public.job_applications;
DROP POLICY IF EXISTS "job_applications_update_policy" ON public.job_applications;
DROP POLICY IF EXISTS "job_applications_delete_policy" ON public.job_applications;
DROP POLICY IF EXISTS "job_results_select_policy" ON public.job_results;
DROP POLICY IF EXISTS "job_results_insert_policy" ON public.job_results;
DROP POLICY IF EXISTS "job_results_update_policy" ON public.job_results;
DROP POLICY IF EXISTS "job_results_delete_policy" ON public.job_results;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can insert own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can update own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can delete own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can view own job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can insert own job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update own job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view own job results" ON public.job_results;
DROP POLICY IF EXISTS "Users can insert own job results" ON public.job_results;
DROP POLICY IF EXISTS "Users can update own job results" ON public.job_results;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_write" ON public.profiles;
DROP POLICY IF EXISTS "cvs_read" ON public.cvs;
DROP POLICY IF EXISTS "cvs_write" ON public.cvs;
DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
DROP POLICY IF EXISTS "job_applications_write" ON NOT EXISTS job_applications;
DROP POLICY IF EXISTS "job_results_read" ON public.job_results;
DROP POLICY IF EXISTS "job_results_write" ON public.job_results;

-- Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_results DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.cvs TO anon, authenticated;
GRANT ALL ON public.job_applications TO anon, authenticated;
GRANT ALL ON public.job_results TO anon, authenticated;
