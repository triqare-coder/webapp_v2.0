# 🚀 Emergency Response Platform - Database Migrations

Complete database migration package for deploying to a new Supabase instance or PostgreSQL server.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Migration Structure](#migration-structure)
3. [Prerequisites](#prerequisites)
4. [Deployment Methods](#deployment-methods)
5. [Verification](#verification)
6. [Rollback](#rollback)

---

## 🎯 Quick Start

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor**

2. **Run Master Deployment Script**
   - Copy contents of `deploy.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for completion (~2-5 minutes)

3. **Verify Installation**
   - Copy contents of `verify.sql`
   - Run in SQL Editor
   - Check that all tables, indexes, and policies were created

### Method 2: Using psql Command Line

```bash
# Get your connection string from Supabase Dashboard > Settings > Database

# Navigate to migrations directory
cd migrations

# Run deployment script
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f deploy.sql

# Verify deployment
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f verify.sql
```

### Method 3: Step-by-Step (Manual Control)

Execute each file individually in the Supabase SQL Editor:

1. `01_schema/01_extensions.sql` - PostgreSQL extensions
2. `01_schema/02_tables.sql` - All 18 tables
3. `01_schema/03_indexes.sql` - Performance indexes
4. `01_schema/04_constraints.sql` - Foreign keys
5. `01_schema/05_triggers.sql` - Triggers
6. `02_security/01_rls_policies.sql` - RLS policies
7. `02_security/02_grants.sql` - Permissions
8. `03_seed/01_configurations.sql` - System configs
9. `03_seed/02_subscription_plans.sql` - Subscription plans

---

## 📁 Migration Structure

```
migrations/
├── README.md                          # This file
├── deploy.sql                         # Master deployment script
├── verify.sql                         # Verification script
├── rollback.sql                       # Rollback script
│
├── 01_schema/                         # Database schema
│   ├── 01_extensions.sql              # PostgreSQL extensions (uuid-ossp, pgcrypto)
│   ├── 02_tables.sql                  # All 18 table definitions
│   ├── 03_indexes.sql                 # 140+ performance indexes
│   ├── 04_constraints.sql             # Foreign key constraints
│   └── 05_triggers.sql                # Updated_at triggers for all tables
│
├── 02_security/                       # Security & RLS
│   ├── 01_rls_policies.sql            # Row Level Security policies
│   └── 02_grants.sql                  # Permission grants (anon, authenticated, service_role)
│
└── 03_seed/                           # Initial data
    ├── 01_configurations.sql          # System configurations (10 settings)
    └── 02_subscription_plans.sql      # Default subscription plans (4 plans)
```

---

## ✅ Prerequisites

### For Supabase Deployment:

1. **Supabase Project**
   - Create new project at https://supabase.com
   - Note your project URL and service role key

2. **Environment Variables**
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Database Access**
   - Ensure you have admin/service role access
   - Database should be empty or ready for migration

### For PostgreSQL Deployment:

1. **PostgreSQL 14+**
2. **psql CLI tool**
3. **Database credentials**
   ```
   Host: your-db-host
   Port: 5432
   Database: postgres
   User: postgres
   Password: your-password
   ```

---

## 🚀 Deployment Methods

### Option 1: Master Deployment Script (Recommended)

**Best for:** Fresh deployments, new Supabase projects

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f deploy.sql
```

**What it does:**
- ✅ Creates all extensions (uuid-ossp, pgcrypto)
- ✅ Creates all 18 tables in dependency order
- ✅ Adds 140+ performance indexes
- ✅ Sets up foreign key constraints
- ✅ Creates updated_at triggers for all tables
- ✅ Configures Row Level Security policies
- ✅ Grants permissions to database roles
- ✅ Inserts seed data (configurations, subscription plans)

**Duration:** ~2-5 minutes

---

### Option 2: Step-by-Step Migration

**Best for:** Controlled deployments, debugging issues, Supabase Dashboard

Execute each file in order:

```bash
# 1. Extensions
psql ... -f 01_schema/01_extensions.sql

# 2. Tables (18 tables)
psql ... -f 01_schema/02_tables.sql

# 3. Indexes (140+ indexes)
psql ... -f 01_schema/03_indexes.sql

# 4. Constraints
psql ... -f 01_schema/04_constraints.sql

# 5. Triggers
psql ... -f 01_schema/05_triggers.sql

# 6. RLS Policies
psql ... -f 02_security/01_rls_policies.sql

# 7. Grants
psql ... -f 02_security/02_grants.sql

# 8. System Configurations
psql ... -f 03_seed/01_configurations.sql

# 9. Subscription Plans
psql ... -f 03_seed/02_subscription_plans.sql
```

---

## ✅ Verification

After deployment, verify the migration was successful:

### Using Supabase Dashboard
1. Go to **SQL Editor**
2. Copy and paste contents of `verify.sql`
3. Run the script
4. Review the output

### Using psql
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f verify.sql
```

### Manual Verification
```bash
# List all tables
psql ... -c "\dt public.*"

# Count tables
psql ... -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Check RLS is enabled
psql ... -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# Verify seed data
psql ... -c "SELECT COUNT(*) FROM configurations;"
psql ... -c "SELECT name, price FROM subscription_plans;"
```

**Expected Results:**
- ✅ **18 tables** created (users, countries, states, cities, pincodes, hospitals, patients, drivers, transport_companies, emergency_contacts, sos_requests, sos_request_assigned, subscription_plans, patient_subscriptions, billing_history, configurations, announcements, pending_csv_imports)
- ✅ **140+ indexes** created for performance
- ✅ **18 triggers** for updated_at timestamps
- ✅ **15+ RLS policies** for data security
- ✅ **10 system configurations** inserted
- ✅ **4 subscription plans** inserted (Basic, Premium, Family, Enterprise)
- ✅ **RLS enabled** on all tables

---

## 🔄 Rollback

### ⚠️ WARNING
**This will DELETE ALL DATA permanently!**
Only use this on development/test environments or if you have a backup.

### Using Supabase Dashboard
1. Go to **SQL Editor**
2. Copy and paste contents of `rollback.sql`
3. Review the script carefully
4. Run the script

### Using psql
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f rollback.sql
```

**What it does:**
- ❌ Drops all 18 tables (CASCADE)
- ❌ Drops all triggers
- ❌ Drops all functions
- ❌ Deletes all data permanently

**Note:** Extensions (uuid-ossp, pgcrypto) are NOT removed as they may be used by other applications.

---

## 📊 Database Tables

After migration, you'll have these tables:

| # | Table | Initial Records | Description |
|---|-------|----------------|-------------|
| 1 | users | 0 | User accounts synced with Clerk |
| 2 | countries | 0 | Countries (to be populated) |
| 3 | states | 0 | States/provinces |
| 4 | cities | 0 | Cities |
| 5 | pincodes | 0 | Postal codes |
| 6 | hospitals | 0 | Healthcare facilities |
| 7 | patients | 0 | Patient profiles |
| 8 | drivers | 0 | Driver profiles |
| 9 | transport_companies | 0 | Transport companies |
| 10 | emergency_contacts | 0 | Emergency contacts |
| 11 | sos_requests | 0 | SOS emergency requests |
| 12 | sos_request_assigned | 0 | Driver assignments |
| 13 | subscription_plans | **4** | **Basic, Premium, Family, Enterprise** |
| 14 | patient_subscriptions | 0 | Active subscriptions |
| 15 | billing_history | 0 | Payment transaction history |
| 16 | configurations | **10** | **System settings (pre-populated)** |
| 17 | announcements | 0 | System announcements |
| 18 | pending_csv_imports | 0 | Pending CSV imports |

### Pre-populated Data

After migration, these tables will have initial data:

**Configurations (10 records):**
- `search_radius_km`: 10
- `max_drivers_per_request`: 5
- `default_request_timeout_minutes`: 30
- `emergency_contact_required`: true
- `auto_assign_drivers`: true
- `driver_location_update_interval_seconds`: 30
- `sos_priority_levels`: ["low", "medium", "high", "critical"]
- `supported_languages`: ["en", "hi", "ml", "ta", "te"]
- `app_version`: 1.0.0
- `maintenance_mode`: false

**Subscription Plans (4 records):**
- **Basic**: ₹0/month - Essential emergency services
- **Premium**: ₹499/month - Enhanced services with priority support
- **Family**: ₹999/month - Complete family protection
- **Enterprise**: ₹4,999/month - Corporate solution

---

## 🔧 Troubleshooting

### Issue: "Extension already exists"
**Solution:** Ignore - this is normal for Supabase

### Issue: "Table already exists"
**Solution:** Run cleanup script first or use `DROP TABLE IF EXISTS`

### Issue: "Permission denied"
**Solution:** Ensure you're using service role key, not anon key

### Issue: "Foreign key constraint fails"
**Solution:** Check table creation order - dependencies must be created first

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the verification results
3. Check Supabase logs (Dashboard → Logs)
4. Consult DATABASE_SCHEMA_DOCUMENTATION.md

---

## 🎉 Next Steps

After successful migration:

1. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```

2. **Configure Clerk Webhook**
   - Update webhook URL in Clerk dashboard
   - Point to: `https://your-domain.com/api/webhooks/clerk`

3. **Test the Application**
   ```bash
   npm run dev
   ```

4. **Populate Location Data**
   - Import countries, states, cities, pincodes using the bulk upload feature
   - Or use the admin dashboard to add locations manually

5. **Import Existing Data** (if migrating from another server)
   - Export data from old server using `pg_dump`
   - Import to new server using `psql` or Supabase Dashboard

---

**Migration Package Version:** 1.0.0  
**Last Updated:** 2026-01-25  
**Compatible With:** Supabase, PostgreSQL 14+

