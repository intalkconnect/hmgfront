import React, { useEffect, useRef, useState } from 'react'
import { socket, connectSocket } from '../services/socket'
import SendMessageForm from './SendMessageForm'
import { supabase } from '../services/supabaseClient'

    const getFileIcon = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase();

  const icons = {
    pdf: 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
    doc: 'https://cdn-icons-png.flaticon.com/512/337/337932.png',
    docx: 'https://cdn-icons-png.flaticon.com/512/337/337932.png',
    xls: 'https://cdn-icons-png.flaticon.com/512/337/337959.png',
    xlsx: 'https://cdn-icons-png.flaticon.com/512/337/337959.png',
    ppt: 'https://cdn-icons-png.flaticon.com/512/337/337953.png',
    pptx: 'https://cdn-icons-png.flaticon.com/512/337/337953.png',
  };

  return icons[ext] || 'https://cdn-icons-png.flaticon.com/512/136/136539.png'; // genérico
};

export default function ChatWindow({ userIdSelecionado }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
    const [modalImage, setModalImage] = useState(null);

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
                  {(() => {
  try {
    let content = msg.content;

// Se tiver type, parseamos se necessário
if (typeof content === 'string') {
  try {
    content = JSON.parse(content);
  } catch {
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{content}</p>;
  }
}

// 🎧 Áudio (voz)
if (msg.type === 'audio' || content.voice || content.url?.endsWith('.ogg')) {
  return (
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: '#f0f0f0',
  borderRadius: '12px',
  padding: '8px 12px'
}}>
  <audio controls style={{ flex: 1, outline: 'none', border: 'none' }}>
    <source src={content.url} type="audio/ogg" />
    Seu navegador não suporta áudio.
  </audio>
</div>

  );
}


// 🖼️ Imagem
if ((msg.type === 'image') || (content.url && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(content.url))) {

  return (
<div
  onClick={() => setModalImage(content.url)}
  style={{
    maxWidth: '220px',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    backgroundColor: '#eee'
  }}
>
<img
  src={content.url}
  alt={content.caption || 'Imagem'}
  style={{ maxWidth: '220px', maxHeight: '200px', borderRadius: '6px', cursor: 'pointer' }}
  onClick={() => setModalImage(content.url)}
/>

</div>

  );
}
        // 📁 Documentos
if (msg.type === 'document' || content.filename) {
  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '10px 12px',
        textDecoration: 'none',
        color: 'inherit',
        maxWidth: '300px'
      }}
    >
      <img
        src={getFileIcon(content.filename)}
        alt="Documento"
        style={{ width: 36, height: 36 }}
      />
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: '0.95rem', display: 'block' }}>
          {content.filename || 'Documento'}
        </strong>
        {content.caption && (
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            {content.caption}
          </span>
        )}
      </div>
    </a>
  );
}


    return <p style={{ color: '#999' }}>Tipo de mensagem desconhecido.</p>;
  } catch (err) {
    return <p style={{ color: 'red' }}>Erro ao interpretar conteúdo.</p>;
  }
})()}


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
          {modalImage && (
  <div
    onClick={() => setModalImage(null)}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      cursor: 'zoom-out'
    }}
  >
    <img
      src={modalImage}
      alt="Imagem ampliada"
      style={{
        maxWidth: '90%',
        maxHeight: '90%',
        borderRadius: '10px',
        boxShadow: '0 0 12px rgba(0,0,0,0.5)'
      }}
    />
  </div>
)}

      </div>
    </div>
  )
}
