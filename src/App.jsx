import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

export default function App() {
  const [userIdSelecionado, setUserIdSelecionado] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);
  const audioRef = useRef(null);
  
  const {
    setConversation,
    setLastRead,
    incrementUnread,
    conversations,
    loadUnreadCounts,
    loadLastReadTimes,
  } = useConversationsStore();
  
  const userIdSelecionadoRef = useRef(null);

  // Inicializa o áudio
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.volume = 0.3;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Verifica se a janela está ativa
  useEffect(() => {
    const handleFocus = () => setIsWindowActive(true);
    const handleBlur = () => setIsWindowActive(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Configura listener de novas mensagens
  useEffect(() => {
    const socket = getSocket();
    
    const handleNewMessage = async (message) => {
      // Atualiza a conversa no estado
      setConversation(message.user_id, {
        ...message,
        ticket_number: message.ticket_number || message.ticket,
        timestamp: message.timestamp,
        content: message.content,
      });

      if (userIdSelecionadoRef.current !== message.user_id) {
        incrementUnread(message.user_id);
        
        // Toca o som de notificação
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (err) {
          console.log("Falha ao tocar som:", err);
        }

        // Mostra notificação se a janela não está ativa
        if (!isWindowActive) {
          const conversation = conversations[message.user_id] || {};
          showNotification({
            ...message,
            name: conversation.name // Pega o name do Zustand store
          });
        }
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [isWindowActive, setConversation, incrementUnread, conversations]);

  // Função para mostrar notificação
  const showNotification = (message) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(
        `Nova mensagem de ${message.name || message.user_id}`, 
        {
          body: getMessagePreview(message.content),
          icon: '/icons/whatsapp.png',
          vibrate: [200, 100, 200],
        }
      );

      notification.onclick = () => {
        window.focus();
        handleSelectUser(message.user_id);
      };
    }
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification(message);
        }
      });
    }
  };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [isWindowActive, setConversation, incrementUnread]);

  // Função para mostrar notificação
  const showNotification = (message) => {
    const notification = new Notification('Nova mensagem recebida', {
      body: `${message.name || message.user_id}: ${truncateContent(message.content)}`,
      icon: '/icons/whatsapp.png',
    });

    notification.onclick = () => {
      window.focus();
      handleSelectUser(message.user_id);
    };
  };

  const truncateContent = (content) => {
    try {
      const parsed = JSON.parse(content);
      return parsed.text || parsed.caption || '[Conteúdo da mensagem]';
    } catch {
      return content.length > 50 ? content.substring(0, 47) + '...' : content;
    }
  };

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

    await setLastRead(fullId, new Date().toISOString());

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
      <audio ref={audioPlayer} src={notificationSound} preload="auto" />
      
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
