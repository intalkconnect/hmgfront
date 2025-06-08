import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import './App.css';

export default function App() {
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const {
    setConversation,
    setLastRead,
    incrementUnread,
    conversations,
    loadUnreadCounts,
    loadLastReadTimes,
  } = useConversationsStore();
  const userIdSelecionadoRef = useRef(null);

  // Inicializa socket e carrega dados
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Conecta ao socket
        connectSocket();
        const socket = getSocket();

        // Configura listeners do socket
        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setSocketError('Falha na conexão com o servidor. Tentando reconectar...');
        });

        socket.on('connect', () => {
          console.log('Socket connected successfully');
          setSocketError(null);
        });

        // Carrega dados iniciais
        await Promise.all([
          fetchConversations(),
          loadLastReadTimes(),
          loadUnreadCounts(),
        ]);

        return () => {
          socket.off('connect_error');
          socket.off('connect');
        };
      } catch (error) {
        console.error('Initialization error:', error);
        setSocketError('Erro ao inicializar a aplicação');
      }
    };

    initializeApp();
  }, []);

  // Configura listener de novas mensagens
  useEffect(() => {
    const socket = getSocket();
    const handleNewMessage = (message) => {
      setConversation(message.user_id, {
        ...message,
        ticket_number: message.ticket_number || message.ticket,
        timestamp: message.timestamp,
        content: message.content,
      });

      if (userIdSelecionadoRef.current !== message.user_id) {
        incrementUnread(message.user_id);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [setConversation, incrementUnread]);

  async function fetchConversations() {
    const { data, error } = await supabase.rpc('listar_conversas');
    if (!error && data) {
      data.forEach((conv) => setConversation(conv.user_id, conv));
    }
  }

  const handleSelectUser = async (userId) => {
    const fullId = userId.includes('@') ? userId : `${userId}@w.msgcli.net`;
    setUserIdSelecionado(fullId);
    userIdSelecionadoRef.current = fullId;

    // Marca como lido
    await setLastRead(fullId, new Date().toISOString());

    // Carrega mensagens do usuário
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', fullId)
      .order('timestamp', { ascending: true });

    if (data) {
      const socket = getSocket();
      socket.emit('join_room', fullId);
      socket.emit('force_refresh', fullId);
    }
  };

  const conversaSelecionada = userIdSelecionado 
    ? Object.values(conversations).find((c) => {
        const idNormalizado = c.user_id.includes('@')
          ? c.user_id
          : `${c.user_id}@w.msgcli.net`;
        return idNormalizado === userIdSelecionado;
      }) || null
    : null;

  return (
    <div className="app-container">
      {socketError && (
        <div className="socket-error-banner">
          {socketError}
        </div>
      )}
      
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
