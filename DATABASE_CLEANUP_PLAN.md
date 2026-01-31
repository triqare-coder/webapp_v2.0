# Database Cleanup: Single Users Table Architecture

## 🎯 **Objective**
Eliminate the dual user table architecture (`users` + `user_records`) and consolidate everything into a single `users` table for consistency and reliability.

## 🚨 **Issues Fixed**

### **1. Dual Table Architecture Conflict**
- **Before**: System had both `users` and `user_records` tables
- **After**: Only `users` table remains
- **Impact**: Eliminates data inconsistency and confusion

### **2. RLS Policy Mismatch**
- **Before**: RLS policies were on `user_records` but app used `users`
- **After**: RLS policies moved to `users` table
- **Impact**: Security policies now work correctly

### **3. Foreign Key Schema Errors**
- **Before**: Foreign keys pointed to `auth.users` (wrong table)
- **After**: Foreign keys point to `public.users` (correct table)
- **Impact**: SOS requests and other features now work

## 🔧 **Cleanup Process**

### **Step 1: Remove user_records References**
```bash
# Files removed:
- src/app/api/admin/create-user-records-table/route.ts
- src/app/api/debug/user-records-status/route.ts
- src/app/api/admin/migrate-to-user-records/route.ts
- src/app/api/admin/populate-user-records/route.ts
```

### **Step 2: Update Code References**
- Updated `src/lib/supabase.ts` - Changed comment to reference `users` table
- Updated `src/app/api/sync-clerk-to-tables/route.ts` - Removed user_records sync logic

### **Step 3: Database Schema Fixes**
Created new admin endpoints:
- `/api/admin/cleanup-user-records` - Drops user_records table and policies
- `/api/admin/fix-foreign-keys` - Fixes foreign key constraints
- `/api/admin/setup-users-table-rls` - Adds RLS policies to users table
- `/api/admin/setup-database` - Runs all fixes in correct order

## 🏗️ **New Architecture**

### **Single Table: `public.users`**
```sql
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'ert', 'transport_company', 'patient', 'driver')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Additional profile fields...
);
```

### **RLS Policies on users table:**
- Users can view/update their own profile
- Admins can view/insert/update/delete all users
- Proper JWT-based authentication

### **Fixed Foreign Keys:**
```sql
-- SOS requests now correctly reference public.users
ALTER TABLE public.sos_requests 
ADD CONSTRAINT sos_requests_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.users(id);

ALTER TABLE public.sos_requests 
ADD CONSTRAINT sos_requests_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.users(id);
```

## 🚀 **Google OAuth Flow (Fixed)**

### **1. User Signs Up with Google**
- Clerk creates user with Google OAuth
- No role initially set

### **2. Webhook Triggers**
- `POST /api/webhooks/clerk` receives `user.created` event
- Detects user has no role assigned
- Sets `role: 'patient'` in both `publicMetadata` and `unsafeMetadata`

### **3. Database Sync**
- `UserService.syncUserFromClerk()` called
- User data synced to `public.users` table
- Role assignment: `publicMetadata.role || unsafeMetadata.role || 'patient'`

### **4. User Access**
- User gets immediate access as 'patient'
- RLS policies enforce proper access control
- Foreign key constraints work correctly

## 📋 **Deployment Steps**

### **Option 1: Automated Setup**
```bash
# Run the comprehensive setup endpoint
POST /api/admin/setup-database
```

### **Option 2: Manual SQL (if automated fails)**
```sql
-- 1. Drop user_records table
DROP TABLE IF EXISTS public.user_records CASCADE;
DROP FUNCTION IF EXISTS update_user_records_updated_at_column();

-- 2. Fix foreign keys
ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_patient_id_fkey;
ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_driver_id_fkey;
ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.users(id);
ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES public.users(id);

-- 3. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (see setup-users-table-rls endpoint for full policies)
```

## ✅ **Verification**

After cleanup, verify:
1. ✅ Only `users` table exists (no `user_records`)
2. ✅ RLS policies are on `users` table
3. ✅ Foreign keys point to `public.users`
4. ✅ Google OAuth users get 'patient' role automatically
5. ✅ SOS requests work without foreign key errors
6. ✅ User authentication and authorization work correctly

## 🎉 **Benefits**

- **Consistency**: Single source of truth for user data
- **Security**: Proper RLS policies on the correct table
- **Reliability**: No more foreign key constraint errors
- **Maintainability**: Simpler architecture, easier to debug
- **Google OAuth**: Seamless role assignment for new users
