import React, { useEffect, useState } from 'react';
import { apiGet } from '../../services/apiClient';
import { File, Mic } from 'lucide-react';
import useConversationsStore from '../../store/useConversationsStore';
import './Sidebar.css';

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
const {
  conversations,
  lastRead,
  unreadCounts,
  clienteAtivo,
    userEmail,
  userFilas,
} = useConversationsStore();

  
  const [distribuicaoTickets, setDistribuicaoTickets] = useState('manual');
  const [filaCount, setFilaCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        console.log('Permissão para notificações:', permission);
      });
    }
  }, []);

  useEffect(() => {
    const fetchSettingsAndFila = async () => {
const settings = await apiGet('/settings');
const distrib = settings.find((s) => s.key === 'distribuicao_tickets');
if (distrib?.value) setDistribuicaoTickets(distrib.value);

      const filaAtivos = Object.values(conversations).filter((conv) => !conv.atendido);
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

const getSnippet = (rawContent) => {
  if (rawContent === undefined || rawContent === null) return '';

  // Se for uma string numérica (apenas dígitos), retorna ela mesma, mesmo se longa
  if (typeof rawContent === 'string' && /^\d+$/.test(rawContent)) {
    return rawContent;
  }

  // Só tenta parsear se parece um JSON (evita erros desnecessários)
  if (typeof rawContent === 'string' && (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.url) {
        const url = parsed.url.toLowerCase();
        if (url.endsWith('.ogg') || url.endsWith('.mp3') || url.endsWith('.wav')) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mic size={18} />Áudio</span>;
        }
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i)) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Imagem</span>;
        }
        return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Arquivo</span>;
      }
      return parsed.text || parsed.caption || '';
    } catch {
      // Se falhar o parse, trata como string normal
    }
  }

  // Se não for JSON ou se falhar, trata como string (trunca se > 40 chars)
  const contentStr = String(rawContent);
  return contentStr.length > 40 ? contentStr.slice(0, 37) + '...' : contentStr;
};

  const filteredConversations = Object.values(conversations).filter((conv) => {
  // 🔒 Respeita permissões
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
        ) : 'Auto'}
      </div>

      <ul className="chat-list">
        {filteredConversations.map((conv) => {
          const fullId = conv.user_id;
          const isSelected = fullId === userIdSelecionado;
          const unreadCount = unreadCounts[fullId] || 0;
          const hasUnread = unreadCount > 0;

          return (
            <li
              key={fullId}
              className={`chat-list-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectUser(fullId)}
            >
<div className="chat-avatar">
  {(isSelected ? clienteAtivo?.channel : conv.channel) === 'whatsapp' && (
    <img src="/icons/whatsapp.png" alt="whatsapp" className="avatar-img" />
  )}
</div>


              <div className="chat-details">
                <div className="chat-title">
                  {conv.name || fullId}
                  {hasUnread && (
                    <span className="unread-badge">
                      {unreadCount > 0 ? unreadCount : ''}
                    </span>
                  )}
                </div>
                <div className="chat-snippet">{getSnippet(conv.content)}</div>
                <div className="chat-meta">
<span className="chat-ticket">
  #{isSelected && clienteAtivo?.ticket_number ? clienteAtivo.ticket_number : conv.ticket_number || '000000'}
</span>
<span className="chat-queue">
  Fila: {isSelected && clienteAtivo?.fila ? clienteAtivo.fila : conv.fila || 'Orçamento'}
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
{/*                 {hasUnread && <span className="unread-dot" />} */}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
