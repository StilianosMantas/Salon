# 🗄️ Database Setup Guide

## 🚨 **IMPORTANT: Database Connection Issues Fixed**

The database connectivity issue has been resolved! The problem was that I added filters for an `active` column that doesn't exist in your database yet.

### ✅ **What I Fixed:**
1. **Commented out** the `active` column filters in `useSupabaseData.js`
2. **Removed** the `active: true` inserts from create functions
3. **Temporarily disabled** soft delete until the columns are added
4. **Fixed** build errors in the new pages

### 🔧 **Your Dashboard Should Work Now!**
Try accessing your dashboard - it should now load data properly from all existing tables.

---

## 📊 **Required Database Changes**

To enable ALL new features (shifts, chairs, profiles, soft delete), you need to run the SQL script I created.

### 🎯 **How to Apply Database Changes:**

1. **Open your Supabase dashboard**
2. **Go to SQL Editor**
3. **FIRST: Check your schema** by running: `/workspaces/Salon/salon/check_schema.sql`
4. **THEN: Run the main script:** `/workspaces/Salon/salon/database_schema_updates.sql`
5. **Execute each section one by one** and check for errors

### 🔍 **IMPORTANT: Schema Check First!**
The `check_schema.sql` file will show you the data types used in your existing tables. This is important because:
- If your `business.id` is `bigint`, the script is correct as updated
- If your tables use `uuid` instead, you'll need to change `BIGINT` to `UUID` in the script

### 📋 **What the Script Adds:**

#### **For Soft Delete Feature:**
```sql
-- Add active columns to existing tables
ALTER TABLE client ADD COLUMN active BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN active BOOLEAN DEFAULT true;
```

#### **For Enhanced Settings:**
```sql
-- Add new business settings columns
ALTER TABLE business ADD COLUMN salon_name VARCHAR(255);
ALTER TABLE business ADD COLUMN chairs_count INTEGER DEFAULT 1;
ALTER TABLE business ADD COLUMN advance_booking_days INTEGER DEFAULT 30;
ALTER TABLE business ADD COLUMN cancellation_hours INTEGER DEFAULT 24;
```

#### **For User Profiles:**
```sql
-- Create profiles table for user management
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'Staff',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **For Staff Shifts:**
```sql
-- Create staff_shifts table
CREATE TABLE staff_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **For Multiple Chairs:**
```sql
-- Create chairs table
CREATE TABLE chairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3273dc',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add chair references to existing tables (optional)
ALTER TABLE appointment ADD COLUMN chair_id UUID REFERENCES chairs(id);
ALTER TABLE slot ADD COLUMN chair_id UUID REFERENCES chairs(id);
```

---

## 🔐 **Security & Permissions**

The script also sets up:
- **Row Level Security (RLS)** policies
- **Proper permissions** for authenticated users  
- **Data isolation** by business
- **Performance indexes** for faster queries

---

## ✅ **After Running the Database Script:**

1. **Uncomment the code** in `useSupabaseData.js`:
   ```javascript
   // Change this:
   // if (table === 'client' || table === 'staff') {
   //   query = query.eq('active', true)
   // }
   
   // To this:
   if (table === 'client' || table === 'staff') {
     query = query.eq('active', true)
   }
   ```

2. **Enable soft delete** by uncommenting the soft delete logic

3. **Test all features:**
   - ✅ Dashboard data loading
   - ✅ Settings page
   - ✅ Profile management  
   - ✅ Staff shifts scheduling
   - ✅ Chairs/stations management
   - ✅ Soft delete for staff/clients

---

## 🚀 **New Features Available:**

### **Settings Page** (`/dashboard/[bid]/settings`)
- Salon name configuration
- Default slot length (15/30/45/60 min)
- Number of chairs/stations
- Advance booking days
- Cancellation notice hours

### **Profile Page** (`/dashboard/[bid]/profile`)
- Personal information management
- Role assignment
- Password reset functionality
- Avatar management

### **Shifts Page** (`/dashboard/[bid]/shifts`)
- Weekly staff scheduling
- Break time management
- Hours calculation
- Visual calendar interface

### **Chairs Page** (`/dashboard/[bid]/chairs`)
- Multiple station management
- Color coding system
- Active/inactive status
- Database schema guidance

---

## 🔧 **Troubleshooting:**

### **If you get database errors:**
1. Check Supabase connection in browser network tab
2. Verify your environment variables in `.env.local`
3. Run each SQL command individually in Supabase SQL editor
4. Check RLS policies if data doesn't appear

### **If features don't work after DB updates:**
1. Clear browser cache
2. Restart the development server (`npm run dev`)
3. Check browser console for any errors
4. Verify the `active` column filters are uncommented

---

## 📞 **Need Help?**

The complete SQL script is in: `/workspaces/Salon/salon/database_schema_updates.sql`

Each section is clearly labeled and includes verification queries to confirm everything worked correctly!