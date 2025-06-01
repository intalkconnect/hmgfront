import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import DetailsPanel from './components/DetailsPanel'

export default function App() {
  const [conversations, setConversations] = useState([])
  const [userIdSelecionado, setUserIdSelecionado] = useState(null)

  // 1) Carrega a lista de conversas iniciais (última mensagem por user_id)
  useEffect(() => {
    fetchConversations()

    // 2) Inscrever no canal de Realtime para novos INSERTs em "messages"
    const channel = supabase
      .channel('realtime-conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const nova = payload.new
          setConversations((prev) => {
            // Se já existe conversa com este user_id, atualize
            const idx = prev.findIndex((c) => c.user_id === nova.user_id)
            if (idx !== -1) {
              const updated = {
                user_id: nova.user_id,
                content: nova.content,
                timestamp: nova.timestamp,
                whatsapp_message_id: nova.whatsapp_message_id
              }
              // Remove o antigo e insere o novo no topo
              const semAntigo = prev.filter((c) => c.user_id !== nova.user_id)
              return [updated, ...semAntigo]
            } else {
              // Nova conversa: coloca no topo
              const created = {
                user_id: nova.user_id,
                content: nova.content,
                timestamp: nova.timestamp,
                whatsapp_message_id: nova.whatsapp_message_id
              }
              return [created, ...prev]
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Função para carregar as conversas pela primeira vez
  async function fetchConversations() {
    /**
     * Aqui usamos uma RPC (função do Postgres) chamada "listar_conversas"
     * que retorna, para cada user_id, a última mensagem (ordenada por timestamp DESC).
     *
     * Caso ainda não tenha criado essa RPC no banco, você pode usar esta query SQL no Supabase SQL Editor:
     *
     * CREATE OR REPLACE FUNCTION public.listar_conversas()
     *   RETURNS TABLE (
     *     user_id text,
     *     whatsapp_message_id text,
     *     content text,
     *     timestamp timestamptz
     *   ) AS $$
     *     SELECT DISTINCT ON (user_id)
     *       user_id,
     *       whatsapp_message_id,
     *       content,
     *       timestamp
     *     FROM public.messages
     *     ORDER BY user_id, timestamp DESC;
     *   $$ LANGUAGE SQL STABLE;
     *
     * Se você preferir não usar RPC, pode fazer a subconsulta manual dentro do JS,
     * mas a versão RPC é mais performática para grandes volumes.
     */
    const { data, error } = await supabase.rpc('listar_conversas')
    if (error) {
      console.error('Erro ao buscar conversas:', error)
    } else {
      setConversations(data)
    }
  }

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <Sidebar
          conversations={conversations}
          onSelectUser={(uid) => setUserIdSelecionado(uid)}
        />
      </aside>

      {/* CHAT WINDOW (coluna do meio) */}
      <main className="chat-window">
        <ChatWindow userIdSelecionado={userIdSelecionado} />
      </main>

      {/* DETAILS PANEL (painel direito) */}
      <aside className="details-panel">
        <DetailsPanel userIdSelecionado={userIdSelecionado} />
      </aside>
    </div>
  )
}
