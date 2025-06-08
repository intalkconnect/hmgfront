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
  const setConversation = useConversationsStore((state) => state.setConversation);
  const setLastRead = useConversationsStore((state) => state.setLastRead);
  const incrementUnread = useConversationsStore((state) => state.incrementUnread);
  const conversations = useConversationsStore((state) => state.conversations);

  const userIdSelecionadoRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    try {
      connectSocket();
      const socket = getSocket();

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setSocketError('Falha na conexão com o servidor. Tentando reconectar...');
      });

      socket.on('connect', () => {
        console.log('Socket connected successfully');
        setSocketError(null);
      });

      return () => {
        socket.off('connect_error');
        socket.off('connect');
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
      setSocketError('Erro ao conectar com o servidor de mensagens');
    }
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Setup message listeners
  useEffect(() => {
    const socket = getSocket();
    let isMounted = true;

    const handleNewMessage = (nova) => {
      if (!isMounted) return;

      console.log('[App] Recebeu new_message:', nova);

      setConversation(nova.user_id, {
        ...nova,
        ticket_number: nova.ticket_number || nova.ticket,
        timestamp: nova.timestamp,
        content: nova.content
      });

      // If the received conversation isn't open → count as unread
      if (userIdSelecionadoRef.current !== nova.user_id) {
        incrementUnread(nova.user_id);
      }

      socket.emit('new_message', nova);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      isMounted = false;
      socket.off('new_message', handleNewMessage);
    };
  }, [setConversation, incrementUnread]);

  async function fetchConversations() {
    try {
      const { data, error } = await supabase.rpc('listar_conversas');
      if (error) {
        console.error('Erro ao buscar conversas:', error);
      } else {
        data.forEach((conv) => {
          setConversation(conv.user_id, conv);
        });
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }

  const handleSelectUser = async (uid) => {
    try {
      const fullId = uid.includes('@') ? uid : `${uid}@w.msgcli.net`;
      setUserIdSelecionado(fullId);
      userIdSelecionadoRef.current = fullId;

      // Mark as read
      setLastRead(fullId, new Date().toISOString());

      // Fetch messages for this user
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', fullId)
        .order('timestamp', { ascending: true });

      if (!error) {
        const socket = getSocket();
        socket.emit('join_room', fullId);
        socket.emit('force_refresh', fullId);
      }
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  };

  const conversaSelecionada =
    Object.values(conversations).find((c) => {
      const idNormalizado = c.user_id.includes('@')
        ? c.user_id
        : `${c.user_id}@w.msgcli.net`;
      return idNormalizado === userIdSelecionado;
    }) || null;

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
