
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import './Sidebar.css'
import { File, Mic, Image } from 'lucide-react';

export default function Sidebar({ conversations, onSelectUser, userIdSelecionado  }) {
  const [clientesMap, setClientesMap] = useState({})

useEffect(() => {
  const map = {}
  conversations.forEach((conv) => {
    const fullId = conv.user_id.includes('@')
      ? conv.user_id
      : `${conv.user_id}@w.msgcli.net`
    map[fullId] = {
      name: conv.name || fullId,
      channel: conv.channel,
      ticket: conv.ticket_number,
      queueName: conv.fila
    }
  })
  setClientesMap(map)
}, [conversations])


  // Função auxiliar para "limpar" e gerar um snippet amigável
  const getSnippet = (rawContent) => {
    // Tenta parsear JSON. Se der certo, extrai o campo url, filename, tipo, etc.
    try {
      const parsed = JSON.parse(rawContent)

      // Se tiver parsed.url (mídia), decide o tipo pelo sufixo
      if (parsed.url) {
        const url = parsed.url.toLowerCase()
        if (url.endsWith('.ogg') || url.endsWith('.mp3') || url.endsWith('.wav')) {
          return     <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Mic  size={18} />
      Áudio
    </span>
        }
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i)) {
                            return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <File size={18} />
      Imagem
    </span>
);
        }
        if (url.endsWith('.pdf')) {
                  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <File size={18} />
      Arquivo
    </span>
);
        }
        // Se for outro arquivo genérico
        return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <File size={18} />
      Arquivo
    </span>
);

      }

      // Se o JSON tiver algum campo de lista
      if (parsed.type === 'list' || parsed.body?.type === 'list') {
        return '🔘 Lista'
      }

      // Se tiver “text” dentro do JSON
      if (parsed.text) {
        // Trunca para 40 caracteres
        return parsed.text.length > 40
          ? parsed.text.slice(0, 37) + '...'
          : parsed.text
      }

      // Caso o JSON tenha “caption” (por ex. em documentos ou imagens)
      if (parsed.caption) {
        return parsed.caption.length > 40
          ? parsed.caption.slice(0, 37) + '...'
          : parsed.caption
      }

      // Se entrou aqui, o JSON não parecia conter mídias nem texto
      return '[mensagem]'
    } catch (e) {
      // Não era JSON. Trata como texto puro e trunca.
      const plain = rawContent || ''
      return plain.length > 40 ? plain.slice(0, 37) + '...' : plain
    }
  }

  return (
    <div className="sidebar-container">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="sidebar-input"
        />
      </div>

      <ul className="chat-list">
        {conversations.map((conv) => {
          const fullId = conv.user_id.includes('@')
            ? conv.user_id
            : `${conv.user_id}@w.msgcli.net`

          const cliente = clientesMap[fullId] || {}
          const nomeCliente = cliente.name || conv.user_id
          const isWhatsapp = (cliente.channel) === 'whatsapp'
          const queueName = cliente.queueName
          const ticket = cliente.ticket

          // Gera o snippet de texto de forma amigável:
          const snippet = getSnippet(conv.content)
const normalizedSelected = userIdSelecionado && userIdSelecionado.includes('@')
  ? userIdSelecionado
  : `${userIdSelecionado}@w.msgcli.net`

          return (
            <li
              key={conv.user_id}
              className={`chat-list-item ${normalizedSelected === fullId ? 'active' : ''}`}
              onClick={() => onSelectUser(fullId)}
            >
              <div className="chat-avatar">
                {isWhatsapp && (
                  <img
                    src="/icons/whatsapp.png"
                    alt="whatsapp"
                    className="avatar-img"
                  />
                )}
              </div>

              <div className="chat-details">
                <div className="chat-title">{nomeCliente}</div>
                <div className="chat-snippet">{snippet}</div>
                <div className="chat-meta">
                  <br />
                  <span className="chat-ticket">
                    #{ticket || '000000'}
                  </span>
                  <span className="chat-queue">
                    Fila:{queueName || 'Orçamento'}
                  </span>
                </div>
              </div>

              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
