-- =====================================================
-- SALON MANAGEMENT SYSTEM - STORAGE BUCKET SETUP
-- =====================================================
-- Run these SQL commands in your Supabase SQL editor
-- Execute them one by one and check for any errors

-- =====================================================
-- 1. CREATE STORAGE BUCKET FOR CLIENT PHOTOS
-- =====================================================

-- Create the client-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-photos', 'client-photos', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE STORAGE POLICIES FOR CLIENT PHOTOS
-- =====================================================

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-photos');

-- Policy to allow authenticated users to view files
CREATE POLICY "Allow authenticated views" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'client-photos');

-- Policy to allow authenticated users to update files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'client-photos');

-- Policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'client-photos');

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the bucket was created correctly:

-- Check if bucket was created
-- SELECT * FROM storage.buckets WHERE id = 'client-photos';

-- Check if policies were created
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The bucket is set to public=true for easier access
-- 2. Policies ensure only authenticated users can manage files
-- 3. Files will be accessible via: https://your-project.supabase.co/storage/v1/object/public/client-photos/filename
-- 4. Update your application code to reference this bucket for photo uploads