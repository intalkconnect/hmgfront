// src/components/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './Sidebar.css';
import { File, Mic } from 'lucide-react';
import useConversationsStore from '../../store/useConversationsStore';

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
  const conversationsMap = useConversationsStore((state) => state.conversations);
  const lastReadMap = useConversationsStore((state) => state.lastRead);
  const unreadCountMap = useConversationsStore((state) => state.unreadCount);
  const conversations = Object.values(conversationsMap);
  const [distribuicaoTickets, setDistribuicaoTickets] = useState('manual');
  const [filaCount, setFilaCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSettingsAndFila = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'distribuicao_tickets')
        .single();

      if (data?.value) {
        setDistribuicaoTickets(data.value);
      }

      const filaAtivos = conversations.filter((conv) => !conv.atendido);
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

  const getSnippet = (rawContent) => {
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
        if (url.endsWith('.pdf')) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Arquivo</span>;
        }
        return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Arquivo</span>;
      }

      if (parsed.type === 'list' || parsed.body?.type === 'list') {
        return '🔘 Lista';
      }

      if (parsed.text) {
        return parsed.text.length > 40 ? parsed.text.slice(0, 37) + '...' : parsed.text;
      }

      if (parsed.caption) {
        return parsed.caption.length > 40 ? parsed.caption.slice(0, 37) + '...' : parsed.caption;
      }

      return '[mensagem]';
    } catch (e) {
      const plain = rawContent || '';
      return plain.length > 40 ? plain.slice(0, 37) + '...' : plain;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.content?.toLowerCase().includes(searchTerm.toLowerCase());
    return searchTerm ? matchesSearch : true;
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
          const nomeCliente = conv.name || fullId;
          const isWhatsapp = conv.channel === 'whatsapp';
          const queueName = conv.fila || 'Orçamento';
          const ticket = conv.ticket_number || '000000';
          const snippet = getSnippet(conv.content);
          const isSelected = fullId === userIdSelecionado;

          const unreadCount = unreadCountMap[fullId] || 0;
          const lastReadTime = lastReadMap[fullId];
          const hasUnread = unreadCount > 0 || 
                          (!isSelected && (!lastReadTime || new Date(conv.timestamp) > new Date(lastReadTime)));

          return (
            <li
              key={fullId}
              className={`chat-list-item ${isSelected ? 'active' : ''}`}
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
                <div className="chat-title">
                  {nomeCliente}
                  {hasUnread && (
                    <span className={`unread-indicator ${unreadCount > 0 ? 'with-count' : ''}`}>
                      {unreadCount > 0 ? unreadCount : ''}
                    </span>
                  )}
                </div>
                <div className="chat-snippet">{snippet}</div>
                <div className="chat-meta">
                  <span className="chat-ticket">#{ticket}</span>
                  <span className="chat-queue">Fila: {queueName}</span>
                </div>
              </div>

              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
                {hasUnread && !unreadCount && (
                  <span className="unread-dot-time" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
