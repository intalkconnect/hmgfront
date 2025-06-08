import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { File, Mic } from "lucide-react";
import useConversationsStore from "../../store/useConversationsStore";
import "./Sidebar.css";

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
  const {
    conversations = {},
    lastRead = {},
    unreadCounts = {},
    fetchInitialUnread = () => {},
    markAsRead = () => {}
  } = useConversationsStore();

  const [distribuicaoTickets, setDistribuicaoTickets] = useState("manual");
  const [filaCount, setFilaCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const socket = window.socket; // Assumindo que o socket está global

    const handleNewMessage = (message) => {
      if (message.user_id !== userIdSelecionado) {
        incrementUnread(message.user_id);
      }
    };

    if (socket) {
      socket.on('new_message', handleNewMessage);
    }

    return () => {
      if (socket) {
        socket.off('new_message', handleNewMessage);
      }
    };
  }, [userIdSelecionado, incrementUnread]);

  const getSnippet = (content) => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      
      if (parsed?.url) {
        const url = parsed.url.toLowerCase();
        if (url.match(/\.(ogg|mp3|wav)$/)) {
          return <><Mic size={16} /> Áudio</>;
        }
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i)) {
          return <><File size={16} /> Imagem</>;
        }
        if (url.endsWith('.pdf')) {
          return <><File size={16} /> PDF</>;
        }
        return <><File size={16} /> Arquivo</>;
      }
      return parsed?.text || parsed?.caption || content || '[mensagem]';
    } catch {
      return typeof content === 'string' ? content : '[mensagem]';
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "distribuicao_tickets")
        .single();
      if (data?.value) setDistribuicaoTickets(data.value);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fila = Object.values(conversations).filter(c => !c?.atendido);
    setFilaCount(fila.length);
  }, [conversations]);

  useEffect(() => {
    Object.keys(conversations).forEach(userId => {
      fetchInitialUnread(userId);
    });
  }, [conversations, fetchInitialUnread]);

  const filteredConversations = Object.values(conversations)
    .filter(conv => {
      if (!conv) return false;
      if (!searchTerm || !conv) return true;
      const term = searchTerm.toLowerCase();
      return (
        (conv.name || '').toLowerCase().includes(term) ||
        (conv.ticket_number || '').includes(term) ||
        (conv.content || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="sidebar-container">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Pesquisar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="fila-info">
        {distribuicaoTickets === "manual" ? (
          <>
            <span className="fila-count">
              {filaCount > 0 ? `${filaCount} cliente${filaCount > 1 ? 's' : ''} aguardando` : 'Nenhum cliente aguardando'}
            </span>
            <button 
              className="botao-proximo"
              disabled={filaCount === 0}
            >
              Próximo
            </button>
          </>
        ) : <span>Distribuição automática</span>}
      </div>

      <ul className="chat-list">
        {filteredConversations.map(conv => {
          if (!conv) return null;
          
          const unread = unreadCounts[conv.user_id] || 0;
          const isSelected = conv.user_id === userIdSelecionado;
          const hasUnread = !isSelected && unread > 0;

          return (
            <li
              key={conv.user_id}
              className={`chat-list-item ${isSelected ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
              onClick={() => {
                markAsRead(conv.user_id);
                onSelectUser(conv.user_id);
              }}
            >
              <div className="chat-avatar">
                {conv.channel === 'whatsapp' && (
                  <img src="/icons/whatsapp.png" alt="WhatsApp" className="avatar-img" />
                )}
              </div>

              <div className="chat-details">
                <div className="chat-title">
                  {conv.name || conv.user_id.split('@')[0]}
                  {hasUnread && <span className="unread-badge">{unread}</span>}
                </div>
                <div className="chat-snippet">
                  {getSnippet(conv.content)}
                </div>
                <div className="chat-meta">
                  <span>#{conv.ticket_number || '000000'}</span>
                  <span>Fila: {conv.fila || 'Orçamento'}</span>
                </div>
              </div>

              <div className="chat-time">
                {conv.timestamp ? new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
