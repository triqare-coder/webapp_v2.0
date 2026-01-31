import { supabase } from '@/lib/supabase'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export interface SyncReport {
  clerkUsers: number
  databaseUsers: number
  orphanedClerkUsers: number
  orphanedDatabaseUsers: number
  syncedUsers: number
  errors: string[]
}

export interface OrphanedUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: UserRole
  source: 'clerk' | 'database'
}

export class SyncService {
  static async generateSyncReport(): Promise<SyncReport> {
    try {
      // Get all Clerk users
      const clerkUsers = await clerkClient.users.getUserList({ limit: 1000 })
      
      // Get all database users
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')

      if (error) throw error

      const report: SyncReport = {
        clerkUsers: clerkUsers.data.length,
        databaseUsers: dbUsers?.length || 0,
        orphanedClerkUsers: 0,
        orphanedDatabaseUsers: 0,
        syncedUsers: 0,
        errors: []
      }

      // Find orphaned Clerk users (exist in Clerk but not in database)
      const dbClerkIds = new Set(dbUsers?.map(u => u.clerk_user_id) || [])
      const orphanedClerk = clerkUsers.data.filter(u => !dbClerkIds.has(u.id))
      report.orphanedClerkUsers = orphanedClerk.length

      // Find orphaned database users (exist in database but not in Clerk)
      const clerkIds = new Set(clerkUsers.data.map(u => u.id))
      const orphanedDb = dbUsers?.filter(u => !clerkIds.has(u.clerk_user_id)) || []
      report.orphanedDatabaseUsers = orphanedDb.length

      // Calculate synced users
      report.syncedUsers = report.clerkUsers - report.orphanedClerkUsers

      return report
    } catch (error: any) {
      console.error('Error generating sync report:', error)
      return {
        clerkUsers: 0,
        databaseUsers: 0,
        orphanedClerkUsers: 0,
        orphanedDatabaseUsers: 0,
        syncedUsers: 0,
        errors: [error.message || 'Unknown error occurred']
      }
    }
  }

  static async getOrphanedUsers(): Promise<OrphanedUser[]> {
    try {
      const orphanedUsers: OrphanedUser[] = []

      // Get all Clerk users
      const clerkUsers = await clerkClient.users.getUserList({ limit: 1000 })
      
      // Get all database users
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')

      if (error) throw error

      // Find orphaned Clerk users
      const dbClerkIds = new Set(dbUsers?.map(u => u.clerk_user_id) || [])
      const orphanedClerk = clerkUsers.data.filter(u => !dbClerkIds.has(u.id))
      
      orphanedClerk.forEach(user => {
        orphanedUsers.push({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || 'No email',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: (user.publicMetadata?.role as UserRole) || undefined,
          source: 'clerk'
        })
      })

      // Find orphaned database users
      const clerkIds = new Set(clerkUsers.data.map(u => u.id))
      const orphanedDb = dbUsers?.filter(u => !clerkIds.has(u.clerk_user_id)) || []
      
      orphanedDb.forEach(user => {
        orphanedUsers.push({
          id: user.id,
          email: user.email,
          firstName: user.first_name || undefined,
          lastName: user.last_name || undefined,
          role: user.role as UserRole,
          source: 'database'
        })
      })

      return orphanedUsers
    } catch (error: any) {
      console.error('Error getting orphaned users:', error)
      throw error
    }
  }

  static async syncUsers(): Promise<SyncReport> {
    try {
      const report: SyncReport = {
        clerkUsers: 0,
        databaseUsers: 0,
        orphanedClerkUsers: 0,
        orphanedDatabaseUsers: 0,
        syncedUsers: 0,
        errors: []
      }

      // Get all Clerk users
      const clerkUsers = await clerkClient.users.getUserList({ limit: 1000 })
      report.clerkUsers = clerkUsers.data.length

      // Get all database users
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')

      if (error) throw error
      report.databaseUsers = dbUsers?.length || 0

      // Find orphaned Clerk users and create database records
      const dbClerkIds = new Set(dbUsers?.map(u => u.clerk_user_id) || [])
      const orphanedClerk = clerkUsers.data.filter(u => !dbClerkIds.has(u.id))
      report.orphanedClerkUsers = orphanedClerk.length

      for (const clerkUser of orphanedClerk) {
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              clerk_user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              first_name: clerkUser.firstName || '',
              last_name: clerkUser.lastName || '',
              full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
              // Get role from publicMetadata first (admin-set), then unsafeMetadata (user-set), then default
              role: (clerkUser.publicMetadata?.role as UserRole) || (clerkUser.unsafeMetadata?.role as UserRole) || 'patient',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])

          if (insertError) {
            report.errors.push(`Failed to sync user ${clerkUser.id}: ${insertError.message}`)
          } else {
            report.syncedUsers++
          }
        } catch (syncError: any) {
          report.errors.push(`Error syncing user ${clerkUser.id}: ${syncError.message}`)
        }
      }

      return report
    } catch (error: any) {
      console.error('Error syncing users:', error)
      throw error
    }
  }

  static async cleanupOrphanedDatabaseUsers(): Promise<number> {
    try {
      // Get all Clerk users
      const clerkUsers = await clerkClient.users.getUserList({ limit: 1000 })
      const clerkIds = new Set(clerkUsers.data.map(u => u.id))

      // Get all database users
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('id, clerk_user_id')

      if (error) throw error

      // Find orphaned database users
      const orphanedDb = dbUsers?.filter(u => !clerkIds.has(u.clerk_user_id)) || []

      if (orphanedDb.length === 0) return 0

      // Delete orphaned database users
      const orphanedIds = orphanedDb.map(u => u.id)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', orphanedIds)

      if (deleteError) throw deleteError

      return orphanedDb.length
    } catch (error: any) {
      console.error('Error cleaning up orphaned database users:', error)
      throw error
    }
  }

  // Migrate direct auth users to Clerk (reverse sync)
  static async migrateDirectAuthUsersToClerk(): Promise<{ success: number; errors: string[] }> {
    try {
      console.log('🔄 Starting migration of direct auth users to Clerk...')

      // Find users with direct auth (bio contains temp_password:)
      const { data: directAuthUsers, error } = await supabase
        .from('users')
        .select('*')
        .like('bio', 'temp_password:%')
        .is('clerk_user_id', null)

      if (error) throw error

      if (!directAuthUsers || directAuthUsers.length === 0) {
        console.log('✅ No direct auth users found to migrate')
        return { success: 0, errors: [] }
      }

      console.log(`📋 Found ${directAuthUsers.length} direct auth users to migrate`)

      const results = { success: 0, errors: [] as string[] }

      for (const user of directAuthUsers) {
        try {
          // Extract password from bio field
          const hashedPassword = user.bio.replace('temp_password:', '')

          // Create user in Clerk
          const clerkUser = await clerkClient.users.createUser({
            emailAddress: [user.email],
            firstName: user.first_name || undefined,
            lastName: user.last_name || undefined,
            password: 'TempPassword123!', // Set a temporary password
            publicMetadata: {
              role: user.role,
              migrated_from_direct_auth: true,
              migration_date: new Date().toISOString()
            },
            unsafeMetadata: {
              role: user.role, // Store role in both public and unsafe for security
              migrated_from_direct_auth: true,
              migration_date: new Date().toISOString()
            }
          })

          console.log(`✅ Created Clerk user for ${user.email}: ${clerkUser.id}`)

          // Update database record with Clerk ID and clean bio
          const { error: updateError } = await supabase
            .from('users')
            .update({
              clerk_user_id: clerkUser.id,
              bio: user.bio.replace(`temp_password:${hashedPassword}`, '').trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) throw updateError

          results.success++
          console.log(`✅ Updated database record for ${user.email}`)

        } catch (userError: any) {
          const errorMsg = `Failed to migrate ${user.email}: ${userError.message}`
          console.error(`❌ ${errorMsg}`)
          results.errors.push(errorMsg)
        }
      }

      console.log(`🎉 Migration complete: ${results.success} successful, ${results.errors.length} errors`)
      return results

    } catch (error: any) {
      console.error('❌ Error during migration:', error)
      throw error
    }
  }

  // Create Clerk user from Supabase user (for new direct auth users)
  static async createClerkUserFromSupabase(supabaseUser: any): Promise<string | null> {
    try {
      console.log(`🔄 Creating Clerk user for ${supabaseUser.email}`)

      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [supabaseUser.email],
        firstName: supabaseUser.first_name || undefined,
        lastName: supabaseUser.last_name || undefined,
        password: 'TempPassword123!', // Temporary password
        publicMetadata: {
          role: supabaseUser.role,
          created_from_supabase: true,
          creation_date: new Date().toISOString()
        },
        unsafeMetadata: {
          role: supabaseUser.role, // Store role in both public and unsafe for security
          created_from_supabase: true,
          creation_date: new Date().toISOString()
        }
      })

      console.log(`✅ Created Clerk user: ${clerkUser.id}`)

      // Update Supabase record with Clerk ID
      const { error } = await supabase
        .from('users')
        .update({
          clerk_user_id: clerkUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', supabaseUser.id)

      if (error) {
        console.error('❌ Failed to update Supabase record:', error)
        return null
      }

      return clerkUser.id

    } catch (error: any) {
      console.error(`❌ Failed to create Clerk user for ${supabaseUser.email}:`, error)
      return null
    }
  }
}
