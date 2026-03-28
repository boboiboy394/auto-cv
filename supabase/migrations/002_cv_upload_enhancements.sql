-- ============================================================
-- Task 2.1: CV Upload & Parse — Schema Updates
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Add parse metadata columns to cvs table (safe to run on existing data)
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS parse_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS warnings text[] DEFAULT '{}';

-- ============================================================
-- SUPABASE STORAGE — Create bucket MANUALLY
-- ============================================================
-- IMPORTANT: Bucket creation via SQL may not work on all Supabase plans.
-- Recommended: Create bucket manually in Supabase Dashboard → Storage
--
-- Bucket settings:
--   Name:        cvs
--   Public:      false (private bucket)
--   File size limit: 5,242,880 bytes (5MB)
--   Allowed MIME types:
--     - application/pdf
--     - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- Alternatively try via SQL (may require Supabase CLI or dashboard with SQL enabled):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false,
  5242880,
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- Only the file owner can access their CV files
-- Note: These only work when Clerk JWT template is configured
-- in Supabase → Authentication → JWT Templates → Clerk
-- ============================================================

-- Allow authenticated users to upload their own CVs
-- Path format: cvs/{userId}/{filename}
CREATE POLICY IF NOT EXISTS "cvs_upload"
  ON storage.objects FOR UPLOAD
  WITH CHECK (
    bucket_id = 'cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to read their own CVs
CREATE POLICY IF NOT EXISTS "cvs_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own CVs
CREATE POLICY IF NOT EXISTS "cvs_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- PREREQUISITES BEFORE THIS MIGRATION RUNS:
-- 1. Create bucket "cvs" in Supabase Dashboard → Storage
-- 2. Setup Clerk JWT template: Supabase → Authentication → JWT Templates → Clerk
--    (This enables auth.uid() to return Clerk user ID)
-- 3. Enable RLS on tables: ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
-- ============================================================
