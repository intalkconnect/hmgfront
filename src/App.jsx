// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { socket, connectSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import './App.css';

export default function App() {
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);
  const setConversation = useConversationsStore((state) => state.setConversation);
  const { setConversation, incrementUnread } = useConversationsStore.getState()
  const conversations = useConversationsStore((state) => state.conversations);

  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
const handleNewMessage = (nova) => {
  setConversation(nova.user_id, {
    ...nova,
    ticket_number: nova.ticket_number || nova.ticket,
  })

  // Sinaliza como não lida se não for a conversa atual
  if (nova.user_id !== userIdSelecionado) {
    incrementUnread(nova.user_id)
  }

  socket.emit('new_message', nova)
}

    console.log('[App] Inscrevendo em socket.on("new_message")');
    socket.on('new_message', handleNewMessage);

    return () => {
      console.log('[App] Removendo listener de new_message');
      socket.off('new_message', handleNewMessage);
    };
  }, [setConversation]);

const setLastRead = useConversationsStore((state) => state.setLastRead)
  
  async function fetchConversations() {
    const { data, error } = await supabase.rpc('listar_conversas');
    if (error) {
      console.error('Erro ao buscar conversas:', error);
    } else {
      console.log('[DEBUG] Conversas retornadas:', data);
      data.forEach((conv) => {
        setConversation(conv.user_id, conv);
      });
    }
  }

  const conversaSelecionada =
    Object.values(conversations).find((c) => {
      const idNormalizado = c.user_id.includes('@')
        ? c.user_id
        : `${c.user_id}@w.msgcli.net`;
      return idNormalizado === userIdSelecionado;
    }) || null;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <Sidebar
          onSelectUser={async (uid) => {
            const fullId = uid.includes('@') ? uid : `${uid}@w.msgcli.net`;
            setUserIdSelecionado(fullId);

            setLastRead(fullId, new Date().toISOString())

            const { data, error } = await supabase
              .from('messages')
              .select('*')
              .eq('user_id', fullId)
              .order('timestamp', { ascending: true });

            if (!error) {
              socket.emit('join_room', fullId);
              socket.emit('force_refresh', fullId);
            }
          }}
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
