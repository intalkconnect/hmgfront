import React, { useEffect, useState } from 'react';
import { apiGet } from '../../services/apiClient';
import { File, Mic } from 'lucide-react';
import useConversationsStore from '../../store/useConversationsStore';
import './Sidebar.css';

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 50%)`;
};

export default function Sidebar() {
  const {
    conversations,
    unreadCounts,
    userEmail,
    userFilas,
    selectedUserId,
    setSelectedUserId,
  } = useConversationsStore();

  const [distribuicaoTickets, setDistribuicaoTickets] = useState('manual');
  const [filaCount, setFilaCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSettingsAndFila = async () => {
      const settings = await apiGet('/settings');
      const distrib = settings.find((s) => s.key === 'distribuicao_tickets');
      if (distrib?.value) setDistribuicaoTickets(distrib.value);

      useConversationsStore.getState().setSettings(settings);

      const filaAtivos = Object.values(conversations).filter(
        (conv) => !conv.atendido
      );
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

  const getSnippet = (rawContent) => {
    if (!rawContent) return '';

    if (typeof rawContent === 'string' && /^\d+$/.test(rawContent)) return rawContent;

    if (
      typeof rawContent === 'string' &&
      (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('['))
    ) {
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.url) {
          const url = parsed.url.toLowerCase();
          if (url.endsWith('.ogg') || url.endsWith('.mp3') || url.endsWith('.wav')) {
            return (
              <span className="chat-icon-snippet">
                <Mic size={18} /> Áudio
              </span>
            );
          }
          if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i)) {
            return (
              <span className="chat-icon-snippet">
                <File size={18} /> Imagem
              </span>
            );
          }
          return (
            <span className="chat-icon-snippet">
              <File size={18} /> Arquivo
            </span>
          );
        }
        return parsed.text || parsed.caption || '';
      } catch {
        // fallback
      }
    }

    const contentStr = String(rawContent);
    return contentStr.length > 40 ? contentStr.slice(0, 37) + '...' : contentStr;
  };

  const filteredConversations = Object.values(conversations).filter((conv) => {
    const autorizado =
      conv.status === 'open' &&
      conv.assigned_to === userEmail &&
      userFilas.includes(conv.fila);

    if (!autorizado) return false;

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.user_id?.toLowerCase().includes(searchLower) ||
      conv.content?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="sidebar-container">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="sidebar-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="fila-info">
        {distribuicaoTickets === 'manual' ? (
          <>
            <span className="fila-count">
              {filaCount > 0
                ? `${filaCount} cliente${filaCount > 1 ? 's' : ''} aguardando`
                : 'Não há clientes aguardando'}
            </span>
            <button
              className="botao-proximo"
              onClick={() => console.log('Puxar próximo cliente')}
              disabled={filaCount === 0}
            >
              Próximo
            </button>
          </>
        ) : (
          'Auto'
        )}
      </div>

      <ul className="chat-list">
        {filteredConversations.map((conv) => {
          const fullId = conv.user_id;
          const isSelected = fullId === selectedUserId;
          const unreadCount = unreadCounts[fullId] || 0;
          const showUnread = !isSelected && unreadCount > 0;
          const canalWhatsapp = conv.channel === 'whatsapp';

          return (
            <li
              key={fullId}
              className={`chat-list-item ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedUserId(fullId)}
              role="button"
              tabIndex={0}
            >
              <div className="chat-avatar-initial">
                <div
                  className="avatar-circle"
                  style={{ backgroundColor: stringToColor(conv.name || conv.user_id) }}
                >
                  {conv.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {canalWhatsapp && (
                  <img
                    src="/icons/whatsapp.png"
                    alt="whatsapp"
                    className="whatsapp-icon-overlay"
                  />
                )}
              </div>

              <div className="chat-details">
                <div className="chat-title">
                  {conv.name || fullId}
                  {showUnread && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </div>

                

                <div className="chat-meta">
                  <span className="chat-ticket">
                    #{conv.ticket_number || '000000'}
                  </span>
                  <span className="chat-queue-badge">
                    {conv.fila || 'Orçamento'}
                  </span>
                </div>
              </div>
<div className="chat-snippet">{getSnippet(conv.content)}</div>
              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </div>

              
            </li>
          );
        })}
      </ul>
    </div>
  );
}
