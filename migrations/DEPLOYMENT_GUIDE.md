# 🚀 Complete Deployment Guide

Step-by-step guide to deploy the Emergency Response Platform database to a new Supabase instance.

---

## 📋 Pre-Deployment Checklist

### 1. Create New Supabase Project

- [ ] Go to https://app.supabase.com
- [ ] Click "New Project"
- [ ] Choose organization
- [ ] Enter project name (e.g., "emergency-response-prod")
- [ ] Choose database password (save this securely!)
- [ ] Select region (choose closest to your users)
- [ ] Wait for project to be ready (~2 minutes)

### 2. Gather Required Information

- [ ] **Project URL**: `https://xxxxx.supabase.co`
- [ ] **Project Reference**: `xxxxx` (from URL)
- [ ] **Anon Key**: Found in Settings > API
- [ ] **Service Role Key**: Found in Settings > API (keep secret!)
- [ ] **Database Password**: The one you set during project creation

### 3. Prepare Environment

- [ ] Have access to the migration files
- [ ] Have psql installed (optional, for command line deployment)
- [ ] Have database credentials ready

---

## 🎯 Deployment Steps

### Step 1: Deploy Database Schema

#### Option A: Using Supabase Dashboard (Easiest)

1. **Open SQL Editor**
   - Go to your Supabase project
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run Deployment Script**
   - Open `migrations/deploy.sql` in a text editor
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" button
   - Wait for completion (2-5 minutes)

3. **Check for Errors**
   - Review the output in the Results panel
   - Look for any error messages
   - All statements should complete successfully

#### Option B: Using psql Command Line

```bash
# Navigate to migrations directory
cd migrations

# Run deployment
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f deploy.sql
```

Replace:
- `[YOUR-PASSWORD]` with your database password
- `[PROJECT-REF]` with your project reference

---

### Step 2: Verify Deployment

1. **Run Verification Script**
   - In SQL Editor, create a new query
   - Copy contents of `migrations/verify.sql`
   - Paste and run
   - Review the output

2. **Expected Results**
   ```
   ✅ 2 extensions installed (uuid-ossp, pgcrypto)
   ✅ 18 tables created
   ✅ 140+ indexes created
   ✅ 18 triggers created
   ✅ 15+ RLS policies active
   ✅ 10 configurations inserted
   ✅ 4 subscription plans inserted
   ```

3. **Manual Verification**
   - Go to "Table Editor" in Supabase Dashboard
   - You should see all 18 tables listed
   - Click on "configurations" - should have 10 rows
   - Click on "subscription_plans" - should have 4 rows

---

### Step 3: Configure Application Environment

1. **Update .env.local File**

Create or update `.env.local` in your Next.js project:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Clerk Configuration (keep existing values)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Google Maps API (keep existing value)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

2. **Get Supabase Keys**
   - Go to Settings > API in Supabase Dashboard
   - Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 4: Configure Clerk Webhook

1. **Get Webhook URL**
   - If deploying to production: `https://your-domain.com/api/webhooks/clerk`
   - If testing locally: Use ngrok or similar tunnel

2. **Update Clerk Dashboard**
   - Go to https://dashboard.clerk.com
   - Select your application
   - Go to "Webhooks" section
   - Click "Add Endpoint"
   - Enter webhook URL
   - Subscribe to events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
   - Copy the signing secret
   - Update `CLERK_WEBHOOK_SECRET` in `.env.local`

---

### Step 5: Test the Application

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Authentication**
   - Go to http://localhost:3000
   - Try to sign up with a new account
   - Check Supabase Table Editor > users table
   - New user should appear after signup

3. **Test Database Connection**
   - Navigate to admin dashboard
   - Check that pages load without errors
   - Try viewing different sections (users, hospitals, etc.)

---

## ✅ Post-Deployment Tasks

### 1. Populate Master Data

- [ ] **Countries**: Use bulk upload CSV or add manually
- [ ] **States**: Import state data for your country
- [ ] **Cities**: Import city data
- [ ] **Pincodes**: Import postal code data

### 2. Add Initial Hospitals

- [ ] Use Google Places scraper (Admin > Hospitals > Scrape Google)
- [ ] Or add hospitals manually
- [ ] Verify hospital data is correct

### 3. Configure System Settings

- [ ] Review configurations table
- [ ] Adjust settings as needed (search radius, timeout, etc.)
- [ ] Update app_version if needed

### 4. Set Up Monitoring

- [ ] Enable Supabase logs (Dashboard > Logs)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure backup schedule

### 5. Security Review

- [ ] Verify RLS policies are active
- [ ] Test that users can only access their own data
- [ ] Ensure service role key is kept secret
- [ ] Review API permissions

---

## 🔧 Troubleshooting

### Issue: "Extension already exists"
**Solution:** This is normal for Supabase. Extensions may be pre-installed. Ignore this message.

### Issue: "Table already exists"
**Solution:** 
- Run `rollback.sql` to clean up
- Then run `deploy.sql` again
- Or manually drop conflicting tables

### Issue: "Permission denied"
**Solution:**
- Ensure you're using the correct database password
- Check that you're using service_role key for API calls
- Verify your IP is not blocked

### Issue: "Foreign key constraint fails"
**Solution:**
- This shouldn't happen if using deploy.sql
- Tables are created in dependency order
- If running files individually, follow the exact order

### Issue: "Connection timeout"
**Solution:**
- Check your internet connection
- Verify Supabase project is running
- Check if your IP needs to be whitelisted

---

## 📞 Support

If you encounter issues:

1. Check the error message carefully
2. Review the verification results
3. Check Supabase logs (Dashboard > Logs)
4. Consult the main README.md
5. Review DATABASE_SCHEMA_DOCUMENTATION.md

---

## 🎉 Success!

If all steps completed successfully:

✅ Database is deployed and ready
✅ All tables, indexes, and policies are in place
✅ Seed data is loaded
✅ Application is connected
✅ Authentication is working

**You're ready to start using the Emergency Response Platform!**

---

**Last Updated:** 2026-01-25  
**Version:** 1.0.0

