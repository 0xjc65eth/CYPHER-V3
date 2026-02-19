/**
 * CYPHER V3 - Supabase Client (Singleton)
 * Centralized Supabase client for all database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let serviceRoleInstance: SupabaseClient | null = null

/**
 * Get the Supabase client (anon key - for client-side safe operations)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      // Return a client that will fail gracefully
      supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder-key')
    } else {
      supabaseInstance = createClient(url, key)
    }
  }
  return supabaseInstance
}

/**
 * Get the Supabase service role client (server-side only - bypasses RLS)
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceRoleInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return getSupabaseClient()
    }

    serviceRoleInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return serviceRoleInstance
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
