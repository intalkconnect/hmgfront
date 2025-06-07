// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { socket, connectSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import './App.css';

export default function App() {
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);

  const setConversation = useConversationsStore((s) => s.setConversation);
  const setLastRead = useConversationsStore((s) => s.setLastRead);
  const setUserIdSelecionadoRef = useConversationsStore((s) => s.setUserIdSelecionadoRef);
  const conversations = useConversationsStore((s) => s.conversations);

  const userIdSelecionadoRef = useRef(null);

  // Vincula a ref ao Zustand para uso global (ex: socket.js)
  useEffect(() => {
    setUserIdSelecionadoRef(userIdSelecionadoRef);
  }, []);

  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    const { data, error } = await supabase.rpc('listar_conversas');
    if (error) {
      console.error('Erro ao buscar conversas:', error);
    } else {
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
            userIdSelecionadoRef.current = fullId;

            setLastRead(fullId, new Date().toISOString());

            const { error } = await supabase
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
