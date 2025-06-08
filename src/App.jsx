import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./services/supabaseClient";
import { socket, connectSocket } from "./services/socket";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatWindow from "./components/ChatWindow/ChatWindow";
import DetailsPanel from "./components/DetailsPanel/DetailsPanel";
import useConversationsStore from "./store/useConversationsStore";
import "./App.css";

export default function App() {
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const userIdSelecionadoRef = useRef(null);
  const socketRef = useRef(null);

  const {
    conversations,
    setConversation,
    setLastRead,
    incrementUnread,
    markAsRead,
    fetchInitialUnread
  } = useConversationsStore();

  // Atualiza referência do usuário selecionado
  useEffect(() => {
    userIdSelecionadoRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // Configura socket
  useEffect(() => {
    socketRef.current = connectSocket();
    return () => socketRef.current?.disconnect();
  }, []);

  // Handler de novas mensagens
  const handleNewMessage = useCallback(async (msg) => {
    if (!msg?.user_id) return;
    
    try {
      setConversation(msg.user_id, {
        ...msg,
        ticket_number: msg.ticket_number || msg.ticket,
        timestamp: msg.timestamp,
        content: msg.content
      });

      if (userIdSelecionadoRef.current !== msg.user_id) {
        await supabase.rpc('increment_unread', { user_id: msg.user_id });
        incrementUnread(msg.user_id);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  }, [setConversation, incrementUnread]);

  // Configura listener do socket
  useEffect(() => {
    const ws = socketRef.current;
    if (!ws) return;

    ws.on('new_message', handleNewMessage);
    return () => ws.off('new_message', handleNewMessage);
  }, [handleNewMessage]);

  // Busca conversas iniciais
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("listar_conversas");
      if (error) throw error;
      
      if (data?.length) {
        await Promise.all(data.map(conv => {
          setConversation(conv.user_id, conv);
          return fetchInitialUnread(conv.user_id);
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoading(false);
    }
  }, [setConversation, fetchInitialUnread]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Handler de seleção de usuário
  const handleSelectUser = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      const fullId = userId.includes("@") ? userId : `${userId}@w.msgcli.net`;
      setUserIdSelecionado(fullId);
      await markAsRead(fullId);
      socketRef.current?.emit("join_room", fullId);
    } catch (error) {
      console.error("Erro ao selecionar usuário:", error);
    }
  }, [markAsRead]);

  if (loading) return <div className="app-loading">Carregando...</div>;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <Sidebar
          onSelectUser={handleSelectUser}
          userIdSelecionado={userIdSelecionado}
        />
      </aside>
      
      <main className="chat-container">
        <ChatWindow
          userIdSelecionado={userIdSelecionado}
          conversaSelecionada={conversations[userIdSelecionado]}
        />
      </main>

      <aside className="details-panel">
        <DetailsPanel
          userIdSelecionado={userIdSelecionado}
          conversaSelecionada={conversations[userIdSelecionado]}
        />
      </aside>
    </div>
  );
}
