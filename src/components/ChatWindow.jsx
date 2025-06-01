import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import SendMessageForm from './SendMessageForm'

export default function ChatWindow({ userIdSelecionado }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // 1) Ao trocar userIdSelecionado, buscar histórico
  useEffect(() => {
    if (!userIdSelecionado) return

    let subscription = null

    async function fetchInitial() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userIdSelecionado)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Erro ao buscar mensagens:', error)
      } else {
        setMessages(data)
      }
      setIsLoading(false)
    }

    fetchInitial()

    // 2) Inscrever no canal de Realtime só para este userId
    subscription = supabase
      .channel(`chat-${userIdSelecionado}`)
      // INSERT: nova mensagem
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userIdSelecionado}`
        },
        (payload) => {
          const novaMsg = payload.new
          setMessages((prev) => {
            // evita duplicatas
            const exists = prev.find((m) => m.id === novaMsg.id)
            if (exists) return prev
            return [...prev, novaMsg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          })
        }
      )
      // UPDATE: se, por exemplo, status da mensagem mudar
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userIdSelecionado}`
        },
        (payload) => {
          const updated = payload.new
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userIdSelecionado])

  // 3) Scroll automático para o fim quando mensagens mudam
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 4) Se não há conversa selecionada, mostre mensagem “Selecione uma conversa”
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
      {/* Cabeçalho do chat */}
      <header className="chat-header">
        <h2 style={{ fontSize: '1.1rem' }}>{userIdSelecionado}</h2>
      </header>

      {/* Lista de mensagens */}
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
                  className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  <span className="message-time" style={{ textAlign: isOutgoing ? 'right' : 'left' }}>
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

      {/* Formulário para enviar nova mensagem */}
      <div className="chat-input">
        <SendMessageForm userIdSelecionado={userIdSelecionado} />
      </div>
    </>
  )
}
