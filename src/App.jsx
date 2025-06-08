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
  const userIdSelecionadoRef = useRef(null);
  const {
    setConversation,
    setLastRead,
    incrementUnread,
    markAsRead,
    conversations
  } = useConversationsStore((state) => ({
    setConversation: state.setConversation,
    setLastRead: state.setLastRead,
    incrementUnread: state.incrementUnread,
    markAsRead: state.markAsRead,
    conversations: state.conversations
  }));

  // Atualiza a referência do usuário selecionado
  useEffect(() => {
    userIdSelecionadoRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // Conexão com o WebSocket
  useEffect(() => {
    connectSocket();
    return () => {
      socket.disconnect();
    };
  }, []);

  // Handler para novas mensagens
  const handleNewMessage = useCallback(async (novaMsg) => {
    try {
      const currentUserId = userIdSelecionadoRef.current;
      
      // Atualiza a conversa no store
      setConversation(novaMsg.user_id, {
        ...novaMsg,
        ticket_number: novaMsg.ticket_number || novaMsg.ticket,
        timestamp: novaMsg.timestamp,
        content: novaMsg.content
      });

      // Se não for o usuário atual, incrementa não lidas
      if (currentUserId !== novaMsg.user_id) {
        // Atualiza no banco de dados
        const { error } = await supabase.rpc('increment_unread', {
          user_id: novaMsg.user_id
        });
        
        if (!error) {
          incrementUnread(novaMsg.user_id);
        }
      }
    } catch (error) {
      console.error("Erro ao processar nova mensagem:", error);
    }
  }, [setConversation, incrementUnread]);

  // Configura listeners do WebSocket
  useEffect(() => {
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [handleNewMessage]);

  // Busca conversas iniciais
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("listar_conversas");
      if (error) throw error;
      
      data.forEach((conv) => {
        setConversation(conv.user_id, conv);
      });
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
    }
  }, [setConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handler para seleção de usuário
  const handleSelectUser = useCallback(async (uid) => {
    try {
      const fullId = uid.includes("@") ? uid : `${uid}@w.msgcli.net`;
      setUserIdSelecionado(fullId);

      // Marca como lido no store e no banco
      await markAsRead(fullId);
      setLastRead(fullId, new Date().toISOString());

      // Busca histórico de mensagens
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", fullId)
        .order("timestamp", { ascending: true });

      // Entra na sala do socket
      socket.emit("join_room", fullId);
    } catch (error) {
      console.error("Erro ao selecionar usuário:", error);
    }
  }, [markAsRead, setLastRead]);

  // Encontra a conversa selecionada
  const conversaSelecionada = Object.values(conversations).find((c) => {
    const idNormalizado = c.user_id.includes("@")
      ? c.user_id
      : `${c.user_id}@w.msgcli.net`;
    return idNormalizado === userIdSelecionado;
  }) || null;

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
          conversaSelecionada={conversaSelecionada}
        />
      </main>

      <aside className="details-panel">
        <DetailsPanel
          userIdSelecionado={userIdSelecionado}
          conversaSelecionada={conversaSelecionada}
        />
      </aside>
    </div>
  );
}
