import { supabase } from '@/lib/supabase'

// Database types
export interface Configuration {
  key: string
  value: string
  created_at: string
  updated_at: string
}

// Input types
export interface CreateConfigurationInput {
  key: string
  value: string
}

export interface UpdateConfigurationInput {
  value: string
}

export class ConfigurationService {
  // Get all configurations
  static async getConfigurations(): Promise<{ data: Configuration[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('key', { ascending: true })

      if (error) {
        console.error('Error fetching configurations:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching configurations:', err)
      return { data: null, error: 'Failed to fetch configurations' }
    }
  }

  // Get a single configuration by key
  static async getConfigurationByKey(key: string): Promise<{ data: Configuration | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('key', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - not found
          return { data: null, error: null }
        }
        console.error('Error fetching configuration:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching configuration:', err)
      return { data: null, error: 'Failed to fetch configuration' }
    }
  }

  // Create or update a configuration (upsert)
  static async upsertConfiguration(configData: CreateConfigurationInput): Promise<{ data: Configuration | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .upsert({
          key: configData.key,
          value: configData.value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })
        .select()
        .single()

      if (error) {
        console.error('Error upserting configuration:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error upserting configuration:', err)
      return { data: null, error: 'Failed to save configuration' }
    }
  }

  // Update a configuration by key
  static async updateConfiguration(key: string, configData: UpdateConfigurationInput): Promise<{ data: Configuration | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .update({
          value: configData.value,
          updated_at: new Date().toISOString()
        })
        .eq('key', key)
        .select()
        .single()

      if (error) {
        console.error('Error updating configuration:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating configuration:', err)
      return { data: null, error: 'Failed to update configuration' }
    }
  }

  // Delete a configuration by key
  static async deleteConfiguration(key: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('configurations')
        .delete()
        .eq('key', key)

      if (error) {
        console.error('Error deleting configuration:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting configuration:', err)
      return { error: 'Failed to delete configuration' }
    }
  }
}

