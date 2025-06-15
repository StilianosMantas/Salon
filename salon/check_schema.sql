-- =====================================================
-- SCHEMA CHECK QUERIES
-- =====================================================
-- Run these queries first to understand your current database schema

-- Check the data type of business.id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'business' AND column_name = 'id';

-- Check the data type of staff.id and staff.business_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff' AND column_name IN ('id', 'business_id');

-- Check the data type of client.id and client.business_id  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'client' AND column_name IN ('id', 'business_id');

-- Check the data type of appointment columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointment' AND column_name IN ('id', 'business_id', 'staff_id', 'client_id');

-- List all existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;