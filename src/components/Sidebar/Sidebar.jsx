// src/components/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { File, Mic } from "lucide-react";
import useConversationsStore from "../../store/useConversationsStore";
import "./Sidebar.css";

export default function Sidebar({ onSelectUser, userIdSelecionado }) {
  const {
    conversations,
    lastRead,
    unreadCounts,
    fetchInitialUnread,
    markAsRead
  } = useConversationsStore((state) => ({
    conversations: state.conversations,
    lastRead: state.lastRead,
    unreadCounts: state.unreadCounts,
    fetchInitialUnread: state.fetchInitialUnread,
    markAsRead: state.markAsRead
  }));

  const [distribuicaoTickets, setDistribuicaoTickets] = useState("manual");
  const [filaCount, setFilaCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Busca configurações e atualiza fila
  useEffect(() => {
    const fetchSettingsAndFila = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "distribuicao_tickets")
        .single();

      if (data?.value) setDistribuicaoTickets(data.value);

      const filaAtivos = Object.values(conversations).filter(conv => !conv.atendido);
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

  // Carrega contagens não lidas iniciais
  useEffect(() => {
    Object.keys(conversations).forEach(userId => {
      fetchInitialUnread(userId);
    });
  }, [conversations, fetchInitialUnread]);

  const handleSelectUser = async (userId) => {
    await markAsRead(userId);
    onSelectUser(userId);
  };

  const getSnippet = (rawContent) => {
    try {
      const parsed = JSON.parse(rawContent);
      
      if (parsed.url) {
        const url = parsed.url.toLowerCase();
        const iconStyle = { display: "flex", alignItems: "center", gap: "6px" };
        
        if (url.match(/\.(ogg|mp3|wav)$/)) {
          return <span style={iconStyle}><Mic size={18} />Áudio</span>;
        }
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg|pdf)$/)) {
          return <span style={iconStyle}><File size={18} />{url.endsWith('.pdf') ? 'PDF' : 'Imagem'}</span>;
        }
        return <span style={iconStyle}><File size={18} />Arquivo</span>;
      }

      const text = parsed.text || parsed.caption || '[mensagem]';
      return text.length > 40 ? `${text.slice(0, 37)}...` : text;
    } catch {
      const plain = rawContent || '';
      return plain.length > 40 ? `${plain.slice(0, 37)}...` : plain;
    }
  };

  // Filtra conversas baseado no search term
  const filteredConversations = Object.values(conversations).filter(conv => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (conv.name || '').toLowerCase().includes(searchLower) ||
      (conv.ticket_number || '').toLowerCase().includes(searchLower) ||
      (conv.content || '').toLowerCase().includes(searchLower)
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
        {distribuicaoTickets === "manual" ? (
          <>
            <span className="fila-count">
              {filaCount > 0
                ? `${filaCount} cliente${filaCount > 1 ? "s" : ""} aguardando`
                : "Não há clientes aguardando"}
            </span>
            <button
              className="botao-proximo"
              onClick={() => console.log("Puxar próximo cliente")}
              disabled={filaCount === 0}
            >
              Próximo
            </button>
          </>
        ) : (
          <span>Distribuição automática</span>
        )}
      </div>

      <ul className="chat-list">
        {filteredConversations.map((conv) => {
          const fullId = conv.user_id;
          const isSelected = fullId === userIdSelecionado;
          const unreadCount = unreadCounts[fullId] || 0;
          const hasUnread = !isSelected && unreadCount > 0;

          return (
            <li
              key={fullId}
              className={`chat-list-item ${isSelected ? "active" : ""} ${hasUnread ? "unread" : ""}`}
              onClick={() => handleSelectUser(fullId)}
            >
              <div className="chat-avatar">
                {conv.channel === "whatsapp" && (
                  <img src="/icons/whatsapp.png" alt="WhatsApp" className="avatar-img" />
                )}
              </div>

              <div className="chat-details">
                <div className="chat-title">
                  {conv.name || fullId.split('@')[0]}
                  {hasUnread && (
                    <span className="unread-badge pulse">
                      {unreadCount}
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
                      minute: '2-digit'
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
