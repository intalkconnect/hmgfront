// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl         = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lê uma variável opcional do .env para o endpoint de Realtime
// Exemplo: ws://bd.dkdevs.com.br:4000/realtime/v1  (sem TLS)
//     ou  wss://bd.dkdevs.com.br/realtime/v1       (com TLS via proxy)
const supabaseRealtimeUrl = import.meta.env.VITE_SUPABASE_REALTIME_URL

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      // Se você definiu VITE_SUPABASE_REALTIME_URL no seu .env, use-a.
      // Caso contrário, será undefined e o SDK usará a URL padrão (supabaseUrl + "/realtime/v1").
      url: supabaseRealtimeUrl,
      params: {
        apikey: supabaseAnonKey
      }
    }
  }
)
