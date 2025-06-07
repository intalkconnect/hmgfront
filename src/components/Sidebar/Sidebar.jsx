// src/components/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './Sidebar.css';
import { File, Mic } from 'lucide-react';
import useConversationsStore from '../../store/useConversationsStore';

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
  const conversationsMap = useConversationsStore((state) => state.conversations);
  const unreadCountMap = useConversationsStore((state) => state.unreadCount);

  const conversations = Object.values(conversationsMap);
  const [distribuicaoTickets, setDistribuicaoTickets] = useState('manual');
  const [filaCount, setFilaCount] = useState(0);

  useEffect(() => {
    const fetchSettingsAndFila = async () => {
      const { data } = await supabase
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
  }, [conversations, unreadCountMap]); // <- importante

  const getSnippet = (rawContent) => {
    try {
      const parsed = JSON.parse(rawContent);
      const url = parsed.url?.toLowerCase();

      if (url) {
        if (url.match(/\.(ogg|mp3|wav)$/)) return <><Mic size={18} /> Áudio</>;
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/)) return <><File size={18} /> Imagem</>;
        if (url.endsWith('.pdf')) return <><File size={18} /> PDF</>;
        return <><File size={18} /> Arquivo</>;
      }

      if (parsed.type === 'list' || parsed.body?.type === 'list') return '🔘 Lista';
      if (parsed.text) return parsed.text.length > 40 ? parsed.text.slice(0, 37) + '...' : parsed.text;
      if (parsed.caption) return parsed.caption.length > 40 ? parsed.caption.slice(0, 37) + '...' : parsed.caption;

      return '[mensagem]';
    } catch {
      return rawContent?.length > 40 ? rawContent.slice(0, 37) + '...' : rawContent;
    }
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-search">
        <input type="text" placeholder="Pesquisar..." className="sidebar-input" />
      </div>

      <div className="fila-info">
        {distribuicaoTickets === 'manual' ? (
          <>
            <span className="fila-count">
              {filaCount > 0
                ? `${filaCount} cliente${filaCount > 1 ? 's' : ''} aguardando`
                : 'Não há clientes aguardando'}
            </span>
            <button className="botao-proximo" disabled={filaCount === 0}>
              Próximo
            </button>
          </>
        ) : 'Distribuição: Auto'}
      </div>

      <ul className="chat-list">
        {conversations.map((conv) => {
          const fullId = conv.user_id;
          const nomeCliente = conv.name || fullId;
          const isWhatsapp = conv.channel === 'whatsapp';
          const queueName = conv.fila || 'Orçamento';
          const ticket = conv.ticket_number || '000000';
          const snippet = getSnippet(conv.content);
          const isSelected = fullId === userIdSelecionado;
          const unread = unreadCountMap[fullId] || 0;

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
                  {unread > 0 && !isSelected && (
                    <span className="unread-count">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="chat-snippet">{snippet}</div>
                <div className="chat-meta">
                  <br />
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
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
