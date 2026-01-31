# Google OAuth Role Assignment Implementation

## 📋 Overview

This document explains how Google OAuth signup users are automatically assigned the "patient" role in both public metadata and unsafe metadata during the signup process.

## 🔧 Implementation Details

### **Webhook Handler Enhancement**

The Clerk webhook handler (`/api/webhooks/clerk/route.ts`) has been enhanced to automatically set the "patient" role for new users who don't have a role assigned (typical for OAuth signups).

### **Key Changes Made:**

1. **Enhanced `handleUserCreated` function**:
   - Checks if user has no role assigned (`!userData.public_metadata?.role && !userData.unsafe_metadata?.role`)
   - Automatically sets "patient" role in both `publicMetadata` and `unsafeMetadata`
   - Updates the user data before syncing to database

2. **Added clerkClient import**:
   - Imported `clerkClient` from `@clerk/nextjs/server`
   - Used async/await pattern: `const clerk = await clerkClient()`

## 🔄 Flow Diagram

```
Google OAuth Signup
        ↓
Clerk creates user (no role)
        ↓
Webhook triggered (user.created)
        ↓
Check if user has role
        ↓
If no role → Set "patient" role
        ↓
Update Clerk metadata
        ↓
Sync to database with role
        ↓
User gets patient dashboard access
```

## 📊 Role Assignment Priority

| **Priority** | **Source** | **Description** |
|--------------|------------|-----------------|
| **1st** | `publicMetadata.role` | Admin-assigned role (highest priority) |
| **2nd** | `unsafeMetadata.role` | User-set role during registration |
| **3rd** | Email pattern matching | Demo/development feature |
| **4th** | **Default: `'patient'`** | **Final fallback for all users** |

## ✅ Benefits

1. **Immediate Access**: Google OAuth users get instant access as patients
2. **Security**: Role is set in both public and unsafe metadata
3. **Consistency**: All OAuth users follow the same pattern
4. **Admin Override**: Admins can still change roles later if needed

## 🧪 Testing

To test the implementation:

1. **Sign up with Google OAuth**
2. **Check user metadata** in Clerk dashboard
3. **Verify database sync** shows role as "patient"
4. **Confirm dashboard redirect** goes to patient mobile app page

## 📝 Code References

- **Webhook Handler**: `src/app/api/webhooks/clerk/route.ts`
- **User Service**: `src/services/userService.ts`
- **Role Hook**: `src/hooks/useRole.ts`
- **Dashboard Routing**: `src/lib/navigation.ts`
