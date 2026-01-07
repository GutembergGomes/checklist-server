import { createApiClient } from '../apiClient'

const apiUrl = import.meta.env.VITE_API_URL || ''
export const supabaseConfigured = !!(apiUrl && /^https?:\/\//.test(apiUrl))

export const supabase = createApiClient()

export type SupabaseClient = typeof supabase
