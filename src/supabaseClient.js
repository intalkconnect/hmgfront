// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// 1) URL para REST / Auth / PostgREST / Storage etc.
const supabaseUrl        = import.meta.env.VITE_SUPABASE_URL
// 2) Sua chave pública ANON (não compartilhe em repo público)
const supabaseAnonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY
// 3) URL exclusiva para WebSocket (Realtime)
const supabaseRealtimeUrl = import.meta.env.VITE_SUPABASE_REALTIME_URL

// Cheque no console se as variáveis chegaram corretamente:
// console.log('REST URL:', supabaseUrl)
// console.log('WS  URL:', supabaseRealtimeUrl)

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      // força o SDK a usar somente ESSA URL para WebSocket
      url: supabaseRealtimeUrl,
      params: {
        // o SDK vai concatenar "/websocket?apikey=..." automaticamente
        apikey: supabaseAnonKey
      }
    }
  }
)
