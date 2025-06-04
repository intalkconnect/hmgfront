import React, { useState, useEffect } from 'react'
import { supabase } from './services/supabaseClient'
import { socket, connectSocket } from './services/socket'
import Sidebar from './components/Sidebar/Sidebar'
import ChatWindow from './components/ChatWindow'
import DetailsPanel from './components/DetailsPanel/DetailsPanel'
import './App.css';

export default function App() {
  const [conversations, setConversations] = useState([])
  const [userIdSelecionado, setUserIdSelecionado] = useState(null)

  // 1) Conecta o Socket.IO assim que o componente montar
  useEffect(() => {
    connectSocket()
  }, [])

  // 2) Carrega conversas iniciais
  useEffect(() => {
    fetchConversations()
  }, [])

  // 3) Inscreve no evento “new_message”
  useEffect(() => {
    const handleNewMessage = (nova) => {
      console.log('[App] Recebeu new_message:', nova)

      // Atualiza a lista da Sidebar
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.user_id === nova.user_id)
        if (idx !== -1) {
          const updated = {
            user_id: nova.user_id,
            content: nova.content,
            timestamp: nova.timestamp,
            whatsapp_message_id: nova.whatsapp_message_id,
            channel: nova.channel
          }
          const semAntigo = prev.filter((c) => c.user_id !== nova.user_id)
          return [updated, ...semAntigo]
        } else {
          const created = {
            user_id: nova.user_id,
            content: nova.content,
            timestamp: nova.timestamp,
            whatsapp_message_id: nova.whatsapp_message_id,
            channel: nova.channel
          }
          return [created, ...prev]
        }
      })

      // Força reemissão local para o ChatWindow
      socket.emit('new_message', nova)
    }

    console.log('[App] Inscrevendo em socket.on("new_message")')
    socket.on('new_message', handleNewMessage)

    return () => {
      console.log('[App] Removendo listener de new_message')
      socket.off('new_message', handleNewMessage)
    }
  }, [])

async function fetchConversations() {
  const { data, error } = await supabase.rpc('listar_conversas')
  if (error) {
    console.error('Erro ao buscar conversas:', error)
  } else {
    console.log('[DEBUG] Conversas retornadas:', data) // <-- Adicionado
    setConversations(data)
  }
}


  return (
    <div className="app-container">
      <aside className="sidebar">
        <Sidebar
          conversations={conversations}
onSelectUser={async (uid) => {
  const fullId = uid.includes('@') ? uid : `${uid}@w.msgcli.net`
  setUserIdSelecionado(fullId)

  // Recarrega mensagens para evitar perdas
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', fullId)
    .order('timestamp', { ascending: true })

  if (!error) {
    socket.emit('join_room', fullId) // Garante nova sala
    socket.emit('force_refresh', fullId) // (opcional) para casos de broadcast manual
  }
}}


        />
      </aside>

      <main className="chat-container">
        <ChatWindow userIdSelecionado={userIdSelecionado} />
      </main>

      <aside className="details-panel">
        <DetailsPanel userIdSelecionado={userIdSelecionado} />
      </aside>
    </div>
  )
}
