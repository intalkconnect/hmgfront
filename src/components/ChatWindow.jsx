import React, { useEffect, useRef, useState } from 'react'
import { socket, connectSocket } from '../services/socket'
import SendMessageForm from './SendMessageForm'
import { supabase } from '../services/supabaseClient'

export default function ChatWindow({ userIdSelecionado }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const currentUserIdRef = useRef(null)

  // Conecta socket
  useEffect(() => {
    connectSocket()
  }, [])

  // Atualiza referência do usuário atual
  useEffect(() => {
    currentUserIdRef.current = userIdSelecionado
  }, [userIdSelecionado])

  // Busca histórico
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
          console.error('❌ Erro ao buscar mensagens:', error)
        } else if (isMounted) {
          setMessages(data)
        }
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userIdSelecionado])

  // Sala socket
  useEffect(() => {
    if (!userIdSelecionado) return
    const room = `chat-${userIdSelecionado}`
    console.log('[socket] Entrando na sala:', room)
    socket.emit('join_room', userIdSelecionado)

    return () => {
      console.log('[socket] Saindo da sala:', room)
      socket.emit('leave_room', userIdSelecionado)
    }
  }, [userIdSelecionado])

  // Listeners (uma vez)
  useEffect(() => {
    const handleNewMessage = (novaMsg) => {
      const activeUser = currentUserIdRef.current
      if (novaMsg.user_id !== activeUser) return
      setMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev
        return [...prev, novaMsg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      })
    }

    const handleUpdateMessage = (updatedMsg) => {
      const activeUser = currentUserIdRef.current
      if (updatedMsg.user_id !== activeUser) return
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      )
    }

    socket.on('new_message', handleNewMessage)
    socket.on('update_message', handleUpdateMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('update_message', handleUpdateMessage)
    }
  }, [])

  // Scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!userIdSelecionado) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Selecione uma conversa</p>
      </div>
    )
  }

  return (
    <div className="chat-window" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'relative'
    }}>
      <header className="chat-header" style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>{userIdSelecionado}</h2>
      </header>

      <div className="messages-list" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isLoading ? (
          <p>Carregando mensagens...</p>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.direction === 'outgoing'
            return (
              <div key={msg.id} className="message-row" style={{
                justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                display: 'flex',
                marginBottom: '6px'
              }}>
                <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`} style={{
                  background: isOutgoing ? '#dcf8c6' : '#fff',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  maxWidth: '70%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#999',
                    display: 'block',
                    marginTop: '4px',
                    textAlign: isOutgoing ? 'right' : 'left'
                  }}>
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

      <div className="chat-input" style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '10px',
        borderTop: '1px solid #ccc',
        zIndex: 10
      }}>
        <SendMessageForm userIdSelecionado={userIdSelecionado} />
      </div>
    </div>
  )
}