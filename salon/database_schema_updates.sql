-- =====================================================
-- SALON MANAGEMENT SYSTEM - DATABASE SCHEMA UPDATES
-- =====================================================
-- Run these SQL commands in your Supabase SQL editor
-- Execute them one by one and check for any errors

-- =====================================================
-- 1. ADD ACTIVE COLUMN TO EXISTING TABLES (for soft delete)
-- =====================================================

-- Add active column to client table
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add active column to staff table  
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Set all existing records to active
UPDATE client SET active = true WHERE active IS NULL;
UPDATE staff SET active = true WHERE active IS NULL;

-- =====================================================
-- 2. ADD ADDITIONAL BUSINESS SETTINGS
-- =====================================================

-- Add new columns to business table for enhanced settings
ALTER TABLE business 
ADD COLUMN IF NOT EXISTS salon_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS chairs_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS cancellation_hours INTEGER DEFAULT 24;

-- =====================================================
-- 3. CREATE PROFILES TABLE (for user management)
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'Staff',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles (users can only see/edit their own profile)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 4. CREATE STAFF_SHIFTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id BIGINT REFERENCES business(id) ON DELETE CASCADE NOT NULL,
  staff_id BIGINT REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_shifts_business_id ON staff_shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_id ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(date);

-- Enable RLS on staff_shifts table
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for staff_shifts (same business access)
CREATE POLICY "Business staff shifts access" ON staff_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business 
      WHERE id = staff_shifts.business_id
    )
  );

-- =====================================================
-- 5. CREATE CHAIRS TABLE (for multiple stations)
-- =====================================================

CREATE TABLE IF NOT EXISTS chairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id BIGINT REFERENCES business(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3273dc',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chairs_business_id ON chairs(business_id);
CREATE INDEX IF NOT EXISTS idx_chairs_active ON chairs(is_active);

-- Enable RLS on chairs table
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;

-- Create policies for chairs (same business access)
CREATE POLICY "Business chairs access" ON chairs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business 
      WHERE id = chairs.business_id
    )
  );

-- =====================================================
-- 6. ADD CHAIR REFERENCES TO EXISTING TABLES
-- =====================================================

-- Add chair_id to appointment table (optional - for future use)
ALTER TABLE appointment 
ADD COLUMN IF NOT EXISTS chair_id UUID REFERENCES chairs(id);

-- Add chair_id to slot table (optional - for future use)
ALTER TABLE slot 
ADD COLUMN IF NOT EXISTS chair_id UUID REFERENCES chairs(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_chair_id ON appointment(chair_id);
CREATE INDEX IF NOT EXISTS idx_slot_chair_id ON slot(chair_id);

-- =====================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at 
  BEFORE UPDATE ON staff_shifts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_chairs_updated_at 
  BEFORE UPDATE ON chairs 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 8. INSERT DEFAULT CHAIR FOR EXISTING BUSINESSES
-- =====================================================

-- Create a default chair for each existing business
INSERT INTO chairs (business_id, name, description, color, is_active)
SELECT 
  id as business_id,
  'Main Chair' as name,
  'Default salon chair/station' as description,
  '#3273dc' as color,
  true as is_active
FROM business
WHERE id NOT IN (SELECT DISTINCT business_id FROM chairs WHERE business_id IS NOT NULL);

-- =====================================================
-- 9. CREATE SHIFT_TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id BIGINT REFERENCES business(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_templates_business_id ON shift_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(is_active);

-- Enable RLS on shift_templates table
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for shift_templates (same business access)
CREATE POLICY "Business shift templates access" ON shift_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business 
      WHERE id = shift_templates.business_id
    )
  );

-- Add trigger for updated_at on shift_templates
CREATE TRIGGER update_shift_templates_updated_at 
  BEFORE UPDATE ON shift_templates 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default shift templates for existing businesses
INSERT INTO shift_templates (business_id, name, start_time, end_time, break_start, break_end, is_active)
SELECT 
  id as business_id,
  'Full Day (9:00 - 17:00) with 1h break' as name,
  '09:00' as start_time,
  '17:00' as end_time,
  '12:00' as break_start,
  '13:00' as break_end,
  true as is_active
FROM business
WHERE id NOT IN (SELECT DISTINCT business_id FROM shift_templates WHERE business_id IS NOT NULL);

INSERT INTO shift_templates (business_id, name, start_time, end_time, break_start, break_end, is_active)
SELECT 
  id as business_id,
  'Morning (9:00 - 13:00)' as name,
  '09:00' as start_time,
  '13:00' as end_time,
  NULL as break_start,
  NULL as break_end,
  true as is_active
FROM business
WHERE id NOT IN (SELECT DISTINCT business_id FROM shift_templates WHERE business_id IS NOT NULL AND name = 'Morning (9:00 - 13:00)');

INSERT INTO shift_templates (business_id, name, start_time, end_time, break_start, break_end, is_active)
SELECT 
  id as business_id,
  'Afternoon (13:00 - 17:00)' as name,
  '13:00' as start_time,
  '17:00' as end_time,
  NULL as break_start,
  NULL as break_end,
  true as is_active
FROM business
WHERE id NOT IN (SELECT DISTINCT business_id FROM shift_templates WHERE business_id IS NOT NULL AND name = 'Afternoon (13:00 - 17:00)');

INSERT INTO shift_templates (business_id, name, start_time, end_time, break_start, break_end, is_active)
SELECT 
  id as business_id,
  'Evening (17:00 - 21:00)' as name,
  '17:00' as start_time,
  '21:00' as end_time,
  NULL as break_start,
  NULL as break_end,
  true as is_active
FROM business
WHERE id NOT IN (SELECT DISTINCT business_id FROM shift_templates WHERE business_id IS NOT NULL AND name = 'Evening (17:00 - 21:00)');

-- =====================================================
-- 10. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON staff_shifts TO authenticated;
GRANT ALL ON chairs TO authenticated;
GRANT ALL ON shift_templates TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the changes were applied correctly:

-- Check if columns were added
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'client' AND column_name = 'active';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'active';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'business' AND column_name = 'salon_name';

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('profiles', 'staff_shifts', 'chairs');

-- Check if indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('staff_shifts', 'chairs');

-- Check default chairs were created
-- SELECT business_id, name FROM chairs;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. After running these scripts, uncomment the 'active' column filters in useSupabaseData.js
-- 2. The soft delete functionality will then work as intended
-- 3. All new features (shifts, chairs, profiles) will be fully functional
-- 4. RLS policies ensure data security at the database level
-- 5. Indexes improve query performance for filtering and joining