import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./services/supabaseClient";
import { socket, connectSocket } from "./services/socket";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatWindow from "./components/ChatWindow/ChatWindow";
import DetailsPanel from "./components/DetailsPanel/DetailsPanel";
import useConversationsStore from "./store/useConversationsStore";
import "./App.css";

export default function App() {
  // Estados e referências
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);
  const userIdSelecionadoRef = useRef(null);
  const socketRef = useRef(null);

  // Store actions
  const {
    setConversation,
    setLastRead,
    incrementUnread,
    markAsRead,
    conversations
  } = useConversationsStore();

  // Atualiza a referência do usuário selecionado
  useEffect(() => {
    userIdSelecionadoRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // Conexão com WebSocket (executado apenas uma vez)
  useEffect(() => {
    socketRef.current = connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Handler para novas mensagens (useCallback para estabilidade)
  const handleNewMessage = useCallback(async (novaMsg) => {
    const currentUserId = userIdSelecionadoRef.current;
    
    // Atualiza a conversa no store
    setConversation(novaMsg.user_id, {
      ...novaMsg,
      ticket_number: novaMsg.ticket_number || novaMsg.ticket,
      timestamp: novaMsg.timestamp,
      content: novaMsg.content
    });

    // Incrementa não lidas se não for o usuário atual
    if (currentUserId !== novaMsg.user_id) {
      try {
        await supabase.rpc('increment_unread', { user_id: novaMsg.user_id });
        incrementUnread(novaMsg.user_id);
      } catch (error) {
        console.error("Erro ao incrementar não lidas:", error);
      }
    }
  }, [setConversation, incrementUnread]);

  // Configura listeners do WebSocket
  useEffect(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket) return;

    currentSocket.on('new_message', handleNewMessage);
    
    return () => {
      currentSocket.off('new_message', handleNewMessage);
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
    const fullId = uid.includes("@") ? uid : `${uid}@w.msgcli.net`;
    setUserIdSelecionado(fullId);

    try {
      // Marca como lido
      await markAsRead(fullId);
      setLastRead(fullId, new Date().toISOString());

      // Entra na sala do socket
      if (socketRef.current) {
        socketRef.current.emit("join_room", fullId);
      }
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
