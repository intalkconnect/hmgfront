// src/App.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { socket, connectSocket } from './socket'   // <-- importe connectSocket

import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import DetailsPanel from './components/DetailsPanel'

export default function App() {
  const [conversations, setConversations] = useState([])
  const [userIdSelecionado, setUserIdSelecionado] = useState(null)

  // Conecta o Socket.IO assim que o App montar
  useEffect(() => {
    connectSocket()
  }, [])

  // 1) Carrega a lista de conversas iniciais (RPC)
  useEffect(() => {
    fetchConversations()
  }, [])

  // 2) Inscreve no Socket.IO para ouvir “new_message” e atualizar conversas
  useEffect(() => {
    const handleNewMessage = (nova) => {
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

    socket.on('new_message', handleNewMessage)
    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [])

  async function fetchConversations() {
    const { data, error } = await supabase.rpc('listar_conversas')
    if (error) {
      console.error('Erro ao buscar conversas:', error)
    } else {
      setConversations(data)
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <Sidebar
          conversations={conversations}
          onSelectUser={(uid) => setUserIdSelecionado(uid)}
        />
      </aside>

      <main className="chat-window">
        <ChatWindow userIdSelecionado={userIdSelecionado} />
      </main>

      <aside className="details-panel">
        <DetailsPanel userIdSelecionado={userIdSelecionado} />
      </aside>
    </div>
  )
}
