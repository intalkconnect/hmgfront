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
  const [loading, setLoading] = useState(true);
  const userIdSelecionadoRef = useRef(null);
  const socketRef = useRef(null);

  // Verifique se todas estas funções existem no seu store
  const {
    conversations = {},
    setConversation = () => {},
    setLastRead = () => {},
    incrementUnread = () => {},
    markAsRead = () => {},
    fetchInitialUnread = () => {}
  } = useConversationsStore();

  // Atualiza referências e conexões
  useEffect(() => {
    userIdSelecionadoRef.current = userIdSelecionado;
    
    // Conexão com WebSocket
    if (!socketRef.current) {
      socketRef.current = connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userIdSelecionado]);

  // Handler seguro para novas mensagens
  const handleNewMessage = useCallback(async (message) => {
    if (!message?.user_id) return;

    try {
      // Verifica se as funções existem antes de chamar
      if (typeof setConversation === 'function') {
        setConversation(message.user_id, {
          ...message,
          ticket_number: message.ticket_number || message.ticket,
          timestamp: message.timestamp,
          content: message.content
        });
      }

      if (userIdSelecionadoRef.current !== message.user_id) {
        if (typeof incrementUnread === 'function') {
          incrementUnread(message.user_id);
        }
        
        // Atualização no banco de dados
        try {
          await supabase.rpc('increment_unread', { user_id: message.user_id });
        } catch (dbError) {
          console.error("Erro no banco de dados:", dbError);
        }
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
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

  // Busca conversas iniciais com tratamento de erro
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("listar_conversas");
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        data.forEach((conv) => {
          if (conv?.user_id && typeof setConversation === 'function') {
            setConversation(conv.user_id, conv);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoading(false);
    }
  }, [setConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handler seguro para seleção de usuário
  const handleSelectUser = useCallback(async (uid) => {
    if (!uid) return;

    try {
      const fullId = uid.includes("@") ? uid : `${uid}@w.msgcli.net`;
      setUserIdSelecionado(fullId);

      if (typeof markAsRead === 'function') {
        await markAsRead(fullId);
      }

      if (typeof setLastRead === 'function') {
        setLastRead(fullId, new Date().toISOString());
      }

      if (socketRef.current) {
        socketRef.current.emit("join_room", fullId);
      }
    } catch (error) {
      console.error("Erro ao selecionar usuário:", error);
    }
  }, [markAsRead, setLastRead]);

  // Encontra a conversa selecionada com verificação segura
  const getConversaSelecionada = useCallback(() => {
    if (!userIdSelecionado || !conversations) return null;
    
    return Object.values(conversations).find((c) => {
      if (!c?.user_id) return false;
      const idNormalizado = c.user_id.includes("@") 
        ? c.user_id 
        : `${c.user_id}@w.msgcli.net`;
      return idNormalizado === userIdSelecionado;
    }) || null;
  }, [userIdSelecionado, conversations]);

  const conversaSelecionada = getConversaSelecionada();

  if (loading) {
    return <div className="app-loading">Carregando...</div>;
  }

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
