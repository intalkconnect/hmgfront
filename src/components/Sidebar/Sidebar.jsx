import React, { useEffect, useState, useCallback } from "react";
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

  // Formata conteúdo da mensagem
  const getSnippet = useCallback((content) => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (!parsed) return '[mensagem]';
      
      if (parsed.url) {
        const type = parsed.url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i) ? 'Imagem' :
                    parsed.url.match(/\.(ogg|mp3|wav)$/i) ? 'Áudio' :
                    parsed.url.match(/\.pdf$/i) ? 'PDF' : 'Arquivo';
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <File size={18} /> {type}
          </span>
        );
      }
      return parsed.text || parsed.caption || '[mensagem]';
    } catch {
      return typeof content === 'string' ? content : '[mensagem]';
    }
  }, []);

  // Busca configurações
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

  // Atualiza fila de atendimento
  useEffect(() => {
    const fila = Object.values(conversations).filter(c => !c?.atendido);
    setFilaCount(fila.length);
  }, [conversations]);

  // Filtra conversas
  const filteredConversations = Object.values(conversations).filter(conv => {
    if (!searchTerm || !conv) return true;
    const term = searchTerm.toLowerCase();
    return (
      (conv.name || '').toLowerCase().includes(term) ||
      (conv.ticket_number || '').includes(term) ||
      (conv.content || '').toLowerCase().includes(term)
    );
  });

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
            <span>{filaCount > 0 ? `${filaCount} cliente(s) aguardando` : "Sem clientes aguardando"}</span>
            <button disabled={filaCount === 0}>Próximo</button>
          </>
        ) : <span>Distribuição automática</span>}
      </div>

      <ul className="chat-list">
        {filteredConversations?.length > 0 ? (
          filteredConversations.map(conv => {
            const unread = unreadCounts[conv.user_id] || 0;
            const isUnread = conv.user_id !== userIdSelecionado && unread > 0;
            
            return (
              <li
                key={conv.user_id}
                className={`${conv.user_id === userIdSelecionado ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => onSelectUser(conv.user_id)}
              >
                <div className="chat-avatar">
                  {conv.channel === 'whatsapp' && <img src="/icons/whatsapp.png" alt="WhatsApp" />}
                </div>
                <div className="chat-details">
                  <div className="chat-title">
                    {conv.name || conv.user_id.split('@')[0]}
                    {isUnread && <span className="unread-badge">{unread}</span>}
                  </div>
                  <div className="chat-snippet">{getSnippet(conv.content)}</div>
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
          })
        ) : (
          <li className="no-conversations">Nenhuma conversa encontrada</li>
        )}
      </ul>
    </div>
  );
}
