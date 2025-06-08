import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { File, Mic } from 'lucide-react';
import useConversationsStore from '../../store/useConversationsStore';
import './Sidebar.css';

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
  const {
    conversations,
    lastRead,
    unreadCounts,
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
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'distribuicao_tickets')
        .single();

      if (data?.value) setDistribuicaoTickets(data.value);

      const filaAtivos = Object.values(conversations).filter((conv) => !conv.atendido);
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

const getSnippet = (rawContent) => {
  try {
    const parsed = JSON.parse(rawContent);
    
    // Verifica se é um arquivo (áudio, imagem ou genérico)
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

    // Verifica se é uma lista
    if (parsed.type === 'list' || parsed.body?.type === 'list') {
      return '🔘 Lista';
    }

    // Retorna texto ou legenda se existirem
    const text = parsed.text || parsed.caption;
    if (text) {
      // Verifica se é uma sequência longa de números repetidos
      if (/^(\d)\1{8,}$/.test(text)) { // 9+ dígitos iguais
        return text.substring(0, 3) + '...' + text.slice(-3); // Ex: "333...333"
      }
      return text.length > 40 ? text.substring(0, 37) + '...' : text;
    }

    return '[mensagem]';
  } catch {
    // Para conteúdo não-JSON
    if (typeof rawContent === 'string') {
      // Verifica sequências longas de números no conteúdo bruto
      if (/^(\d)\1{8,}$/.test(rawContent)) {
        return rawContent.substring(0, 3) + '...' + rawContent.slice(-3);
      }
      return rawContent.length > 40 ? rawContent.substring(0, 37) + '...' : rawContent;
    }
    return '';
  }
};

  const filteredConversations = Object.values(conversations).filter(conv => {
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
                {conv.channel === 'whatsapp' && (
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
                  <span className="chat-ticket">#{conv.ticket_number || '000000'}</span>
                  <span className="chat-queue">Fila: {conv.fila || 'Orçamento'}</span>
                </div>
              </div>

              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
                {hasUnread && <span className="unread-dot" />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
