// src/App.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient' // só para chamar RPC ou fetch REST se quiser
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import DetailsPanel from './components/DetailsPanel'
import { socket } from './socket' // importa o cliente Socket.IO que você configurou

export default function App() {
  const [conversations, setConversations] = useState([])
  const [userIdSelecionado, setUserIdSelecionado] = useState(null)

  // 1) Carrega a lista de conversas iniciais (RPC ou fetch manual)
  useEffect(() => {
    fetchConversations()
  }, [])

  // 2) Inscreve no Socket.IO para ouvir “new_message” e atualizar conversas
  useEffect(() => {
    const handleNewMessage = (nova) => {
      // Mesma lógica de antes: move/insere conversa ao topo
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.user_id === nova.user_id)
        if (idx !== -1) {
          const updated = {
            user_id: nova.user_id,
            content: nova.content,
            timestamp: nova.timestamp,
            whatsapp_message_id: nova.whatsapp_message_id
          }
          const semAntigo = prev.filter((c) => c.user_id !== nova.user_id)
          return [updated, ...semAntigo]
        } else {
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

    // Assina o evento “new_message” vindo do servidor Socket.IO
    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [])

  // Função para carregar as conversas pela primeira vez
  async function fetchConversations() {
    // Aqui você pode optar por chamar a RPC “listar_conversas” ou
    // fazer um fetch REST supabase.from(…) manualmente. Exemplo com RPC:
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
