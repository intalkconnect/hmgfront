import { createClient } from '@supabase/supabase-js'

const supabaseUrl        = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseRealtimeUrl = import.meta.env.VITE_SUPABASE_REALTIME_URL

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      url: supabaseRealtimeUrl,
      params: { apikey: supabaseAnonKey }
    }
  }
)
