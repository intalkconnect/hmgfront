// Sidebar.js
import React from 'react'
import './Sidebar.css'

export default function Sidebar({ conversations, onSelectUser }) {
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
          const isWhatsapp = conv.channel === 'whatsapp'

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
                <div className="chat-title">{conv.nome || conv.user_id}</div>
                <div className="chat-snippet">{conv.content}</div>
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
