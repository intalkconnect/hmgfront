import { createClient } from '@supabase/supabase-js'


export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    // sobrescreve o endpoint de Realtime
    realtime: {
      // Se você NÃO tiver TLS e o Realtime escutar na porta 4000, use ws://
      // Caso tenha TLS (via nginx, por ex), use wss:// no lugar. 
      url: import.meta.env.VITE_SUPABASE_REALTIME_URL ?? 'https://mensageria-frontend-supabase.9j9goo.easypanel.host/realtime/v1',
      params: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    }
  }
)
