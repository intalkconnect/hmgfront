import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./services/supabaseClient";
import { connectSocket } from "./services/socket";
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

  // Configuração do WebSocket
  useEffect(() => {
    socketRef.current = connectSocket();

    const handleNewMessage = (msg) => {
      if (!msg?.user_id) return;

      setConversation(msg.user_id, {
        ...msg,
        ticket_number: msg.ticket_number || msg.ticket,
        timestamp: msg.timestamp,
        content: msg.content
      });

      if (userIdSelecionadoRef.current !== msg.user_id) {
        incrementUnread(msg.user_id);
      }
    };

    socketRef.current.on('new_message', handleNewMessage);

    return () => {
      socketRef.current?.off('new_message', handleNewMessage);
      socketRef.current?.disconnect();
    };
  }, [setConversation, incrementUnread]);

  // Atualiza referência do usuário
  useEffect(() => {
    userIdSelecionadoRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

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

  useEffect(() => { 
    fetchConversations(); 
  }, [fetchConversations]);

  // Handler de seleção de usuário
  const handleSelectUser = useCallback(async (userId) => {
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
