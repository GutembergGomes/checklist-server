import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey && /^https?:\/\//.test(supabaseUrl))

function makeMockBuilder() {
  return {
    select: async () => ({ data: null, error: new Error('Supabase não configurado') }),
    eq: () => makeMockBuilder(),
    order: () => makeMockBuilder(),
    single: async () => ({ data: null, error: new Error('Supabase não configurado') }),
    insert: async () => ({ data: null, error: new Error('Supabase não configurado') }),
    upsert: async () => ({ data: null, error: new Error('Supabase não configurado') }),
  }
}

const mockSupabase = {
  auth: {
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase não configurado') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null } }),
  },
  from: (_table: string) => makeMockBuilder(),
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'checklist-mobile-auth-token',
      },
      global: {
        headers: {
          'x-application-name': 'checklist-mobile',
        },
      },
      db: {
        schema: 'public',
      },
    })
  : (mockSupabase as any)

export type SupabaseClient = typeof supabase
