import { supabase } from '@/lib/supabase'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export class AutoSyncService {
  // Automatically sync Supabase user to Clerk when created/updated
  static async syncSupabaseUserToClerk(supabaseUser: any): Promise<{ success: boolean; clerkUserId?: string; error?: string }> {
    try {
      console.log(`🔄 Auto-syncing Supabase user to Clerk: ${supabaseUser.email}`)

      // Check if user already has a Clerk ID
      if (supabaseUser.clerk_user_id) {
        console.log(`✅ User already has Clerk ID: ${supabaseUser.clerk_user_id}`)
        return { success: true, clerkUserId: supabaseUser.clerk_user_id }
      }

      // Check if user already exists in Clerk by email
      const existingClerkUsers = await clerkClient.users.getUserList({
        emailAddress: [supabaseUser.email]
      })

      let clerkUser
      if (existingClerkUsers.data.length > 0) {
        // User exists in Clerk, use existing user
        clerkUser = existingClerkUsers.data[0]
        console.log(`✅ Found existing Clerk user: ${clerkUser.id}`)
      } else {
        // Create new user in Clerk
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [supabaseUser.email],
          firstName: supabaseUser.first_name || undefined,
          lastName: supabaseUser.last_name || undefined,
          password: 'TempPassword123!', // Temporary password - user will reset
          publicMetadata: {
            role: supabaseUser.role,
            synced_from_supabase: true,
            sync_date: new Date().toISOString(),
            supabase_user_id: supabaseUser.id
          },
          unsafeMetadata: {
            role: supabaseUser.role, // Store role in both public and unsafe for security
            synced_from_supabase: true,
            sync_date: new Date().toISOString(),
            supabase_user_id: supabaseUser.id
          }
        })
        console.log(`✅ Created new Clerk user: ${clerkUser.id}`)
      }

      // Update Supabase record with Clerk ID
      const { error: updateError } = await supabase
        .from('users')
        .update({
          clerk_user_id: clerkUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', supabaseUser.id)

      if (updateError) {
        console.error('❌ Failed to update Supabase record with Clerk ID:', updateError)
        return { success: false, error: updateError.message }
      }

      console.log(`✅ Successfully synced ${supabaseUser.email} to Clerk`)
      return { success: true, clerkUserId: clerkUser.id }

    } catch (error: any) {
      console.error(`❌ Failed to sync ${supabaseUser.email} to Clerk:`, error)
      return { success: false, error: error.message }
    }
  }

  // Automatically sync when user is created via any method
  static async handleUserCreation(userData: any): Promise<any> {
    try {
      console.log('🚀 Auto-sync triggered for new user creation')

      // First create the user in Supabase
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create user in Supabase:', createError)
        throw createError
      }

      console.log(`✅ Created user in Supabase: ${newUser.email}`)

      // Automatically sync to Clerk
      const syncResult = await this.syncSupabaseUserToClerk(newUser)
      
      if (!syncResult.success) {
        console.warn(`⚠️ User created in Supabase but sync to Clerk failed: ${syncResult.error}`)
        // Don't fail the entire operation - user exists in Supabase
      }

      return { data: newUser, error: null }

    } catch (error: any) {
      console.error('❌ Auto-sync user creation failed:', error)
      return { data: null, error: error.message }
    }
  }

  // Automatically sync when user is updated
  static async handleUserUpdate(userId: string, updateData: any): Promise<any> {
    try {
      console.log(`🔄 Auto-sync triggered for user update: ${userId}`)

      // Update user in Supabase
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Failed to update user in Supabase:', updateError)
        throw updateError
      }

      console.log(`✅ Updated user in Supabase: ${updatedUser.email}`)

      // If user has Clerk ID, sync the update to Clerk
      if (updatedUser.clerk_user_id) {
        try {
          await clerkClient.users.updateUser(updatedUser.clerk_user_id, {
            firstName: updatedUser.first_name || undefined,
            lastName: updatedUser.last_name || undefined,
            publicMetadata: {
              ...updatedUser.public_metadata,
              role: updatedUser.role,
              last_supabase_sync: new Date().toISOString()
            },
            unsafeMetadata: {
              ...updatedUser.unsafe_metadata,
              role: updatedUser.role, // Store role in both public and unsafe for security
              last_supabase_sync: new Date().toISOString()
            }
          })
          console.log(`✅ Synced update to Clerk: ${updatedUser.clerk_user_id}`)
        } catch (clerkError: any) {
          console.warn(`⚠️ Failed to sync update to Clerk: ${clerkError.message}`)
        }
      } else {
        // User doesn't have Clerk ID, try to sync
        const syncResult = await this.syncSupabaseUserToClerk(updatedUser)
        if (!syncResult.success) {
          console.warn(`⚠️ Failed to sync updated user to Clerk: ${syncResult.error}`)
        }
      }

      return { data: updatedUser, error: null }

    } catch (error: any) {
      console.error('❌ Auto-sync user update failed:', error)
      return { data: null, error: error.message }
    }
  }

  // Check and sync any unsynced users (background job)
  static async syncUnsyncedUsers(): Promise<{ synced: number; errors: string[] }> {
    try {
      console.log('🔍 Checking for unsynced users...')

      // Find users without Clerk IDs
      const { data: unsyncedUsers, error } = await supabase
        .from('users')
        .select('*')
        .is('clerk_user_id', null)
        .eq('is_active', true)

      if (error) throw error

      if (!unsyncedUsers || unsyncedUsers.length === 0) {
        console.log('✅ All users are synced')
        return { synced: 0, errors: [] }
      }

      console.log(`📋 Found ${unsyncedUsers.length} unsynced users`)

      const results = { synced: 0, errors: [] as string[] }

      for (const user of unsyncedUsers) {
        const syncResult = await this.syncSupabaseUserToClerk(user)
        if (syncResult.success) {
          results.synced++
        } else {
          results.errors.push(`${user.email}: ${syncResult.error}`)
        }
      }

      console.log(`🎉 Background sync complete: ${results.synced} synced, ${results.errors.length} errors`)
      return results

    } catch (error: any) {
      console.error('❌ Background sync failed:', error)
      return { synced: 0, errors: [error.message] }
    }
  }
}
