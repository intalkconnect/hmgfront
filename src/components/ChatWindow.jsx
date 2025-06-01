// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from 'react'
import { socket } from '../socket'
import SendMessageForm from './SendMessageForm'
import { supabase } from '../supabaseClient' // seu supabaseClient.js existente

export default function ChatWindow({ userIdSelecionado }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // 1) Busca inicial do histórico via Supabase REST (pode ser .from() ou RPC)
  useEffect(() => {
    if (!userIdSelecionado) return

    let isMounted = true
    setIsLoading(true)

    supabase
      .from('messages')
      .select('*')
      .eq('user_id', userIdSelecionado)
      .order('timestamp', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao buscar mensagens:', error)
        } else if (isMounted) {
          setMessages(data)
        }
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userIdSelecionado])

  // 2) Ao trocar userIdSelecionado, entra na sala e escuta eventos
  useEffect(() => {
    if (!userIdSelecionado) return

    // 2.1) Entra na “sala” do Socket.IO
    socket.emit('join_room', userIdSelecionado)

    // 2.2) Função de callback para novas mensagens
    const handleNewMessage = (novaMsg) => {
      if (novaMsg.user_id !== userIdSelecionado) return

      setMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev
        return [...prev, novaMsg].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        )
      })
    }

    // 2.3) Função de callback para atualização de mensagens
    const handleUpdateMessage = (updatedMsg) => {
      if (updatedMsg.user_id !== userIdSelecionado) return
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      )
    }

    socket.on('new_message', handleNewMessage)
    socket.on('update_message', handleUpdateMessage)

    return () => {
      socket.emit('leave_room', userIdSelecionado)
      socket.off('new_message', handleNewMessage)
      socket.off('update_message', handleUpdateMessage)
    }
  }, [userIdSelecionado])

  // 3) Auto‐scroll para o fim ao receber/atualizar mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!userIdSelecionado) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          color: '#555'
        }}
      >
        <p>Selecione uma conversa</p>
      </div>
    )
  }

  return (
    <>
      <header className="chat-header">
        <h2 style={{ fontSize: '1.1rem' }}>{userIdSelecionado}</h2>
      </header>

      <div className="messages-list">
        {isLoading ? (
          <p>Carregando mensagens...</p>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.direction === 'outgoing'
            return (
              <div
                key={msg.id}
                className="message-row"
                style={{
                  justifyContent: isOutgoing ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  className={`message-bubble ${
                    isOutgoing ? 'outgoing' : 'incoming'
                  }`}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </p>
                  <span
                    className="message-time"
                    style={{
                      textAlign: isOutgoing ? 'right' : 'left'
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <SendMessageForm userIdSelecionado={userIdSelecionado} />
      </div>
    </>
  )
}
