// Sidebar.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import './Sidebar.css'

export default function Sidebar({ conversations, onSelectUser }) {
  const [clientesMap, setClientesMap] = useState({})

  useEffect(() => {
    async function fetchClientes() {
      const { data, error } = await supabase.from('clientes').select('user_id, name, channel')
      if (!error && data) {
        const map = {}
        data.forEach(cli => {
          if (cli.user_id) {
            map[cli.user_id] = {
              name: cli.name,
              channel: cli.channel
            }
          }
        })
        setClientesMap(map)
      }
    }
    fetchClientes()
  }, [])

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
          const isWhatsapp = (cliente.channel || conv.channel) === 'whatsapp'

          return (
            <li
              key={conv.user_id}
              className="chat-list-item"
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
                <div className="chat-snippet" style={{ marginBottom: '6px' }}>{conv.content}</div>
                <div className="chat-meta">
                  <span className="chat-ticket">#{conv.ticket || '000000'}</span>
                  <span className="chat-queue">Fila:{conv.fila || 'Orçamento'}</span>
                </div>
              </div>

              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
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
