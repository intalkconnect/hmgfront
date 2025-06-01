import React from 'react'

export default function Sidebar({ conversations, onSelectUser }) {
  return (
    <>
      {/* Campo de busca (não implementado em lógica, apenas UI) */}
      <div style={{ padding: '12px' }}>
        <input
          type="text"
          placeholder="Pesquisar..."
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* Lista de conversas */}
      <ul className="chat-list">
        {conversations.map((conv) => (
          <li
            key={conv.user_id}
            onClick={() => {
              const fullId = conv.user_id.includes('@')
                ? conv.user_id
                : `${conv.user_id}@w.msgcli.net`

              console.log('[Sidebar] Selecionado:', fullId)
              onSelectUser(fullId)
            }}
          >
            <div className="avatar-placeholder" />

            <div className="chat-info">
              <div className="chat-title">{conv.user_id}</div>
              <div className="chat-last-message">{conv.content}</div>
            </div>

            <div className="chat-time">
              {new Date(conv.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
