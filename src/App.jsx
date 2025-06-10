// App.jsx atualizado com Zustand consistente
import React, { useEffect, useRef, useState } from 'react';
import { apiGet } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

export default function App() {
  const audioPlayer = useRef(null);
  const socketRef = useRef(null);

  const {
    selectedUserId,
    setSelectedUserId,
    setUserInfo,
    mergeConversation,
    incrementUnread,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName,
    conversations
  } = useConversationsStore();

  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);

  useEffect(() => {
    setUserInfo({
      email: 'dan_rodrigo@hotmail.com',
      filas: ['Comercial', 'Suporte']
    });
  }, [setUserInfo]);

  useEffect(() => {
    audioPlayer.current = new Audio(notificationSound);
    audioPlayer.current.volume = 0.3;
    return () => {
      if (audioPlayer.current) {
        audioPlayer.current.pause();
        audioPlayer.current = null;
      }
    };
  }, []);

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

  useEffect(() => {
    const initialize = async () => {
      try {
        connectSocket();
        const socket = getSocket();
        socketRef.current = socket;

        socket.on('connect_error', () => {
          setSocketError('Falha na conexão com o servidor. Tentando reconectar...');
        });

        socket.on('connect', () => {
          setSocketError(null);
        });

        socket.on('new_message', async (message) => {
          mergeConversation(message.user_id, {
            ticket_number: message.ticket_number || message.ticket,
            timestamp: message.timestamp,
            content: message.content,
            channel: message.channel,
          });

          if (selectedUserId !== message.user_id) {
            incrementUnread(message.user_id);
            try {
              audioPlayer.current.currentTime = 0;
              await audioPlayer.current.play();
            } catch (e) {}

            if (!isWindowActive) {
              const contactName = getContactName(message.user_id);
              showNotification(message, contactName);
            }
          }
        });

        await Promise.all([fetchConversations(), loadLastReadTimes(), loadUnreadCounts()]);
      } catch (err) {
        setSocketError('Erro ao inicializar a aplicação');
      }
    };
    initialize();
  }, [selectedUserId, isWindowActive, mergeConversation, incrementUnread, getContactName, loadLastReadTimes, loadUnreadCounts]);

  const fetchConversations = async () => {
    try {
      const { userEmail, userFilas } = useConversationsStore.getState();
      if (!userEmail || userFilas.length === 0) return;

      const params = new URLSearchParams({
        assigned_to: userEmail,
        filas: userFilas.join(',')
      });

      const data = await apiGet(`/chats?${params.toString()}`);
      data.forEach((conv) => {
        mergeConversation(conv.user_id, conv);
      });
    } catch (err) {
      console.error('Erro ao buscar /chats:', err);
    }
  };

  const showNotification = (message, contactName) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(
        `Nova mensagem de ${contactName || message.user_id}`,
        {
          body: getMessagePreview(message.content),
          icon: '/icons/whatsapp.png',
          vibrate: [200, 100, 200],
        }
      );

      notification.onclick = () => {
        window.focus();
        setSelectedUserId(message.user_id);
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const contactName = getContactName(message.user_id);
          showNotification(message, contactName);
        }
      });
    }
  };

  const getMessagePreview = (content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.text) return parsed.text;
      if (parsed.caption) return parsed.caption;
      if (parsed.url) return '[Arquivo]';
      return '[Mensagem]';
    } catch {
      return content?.length > 50 ? content.substring(0, 47) + '...' : content;
    }
  };

  const conversaSelecionada = selectedUserId
    ? conversations[selectedUserId] || null
    : null;

  return (
    <div className="app-container">
      {socketError && <div className="socket-error-banner">{socketError}</div>}

      <aside className="sidebar">
        <Sidebar />
      </aside>

      <main className="chat-container">
        <ChatWindow userIdSelecionado={selectedUserId} conversaSelecionada={conversaSelecionada} />
      </main>

      <aside className="details-panel">
        <DetailsPanel userIdSelecionado={selectedUserId} conversaSelecionada={conversaSelecionada} />
      </aside>
    </div>
  );
}
