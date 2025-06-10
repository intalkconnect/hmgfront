import React, { useState, useEffect, useRef } from 'react';
import { apiGet } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

export default function App() {
  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);
  const audioPlayer = useRef(null);

  const {
    selectedUserId,
    setSelectedUserId,
    setConversation,
    setLastRead,
    incrementUnread,
    conversations,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName,
    setUserInfo,
  } = useConversationsStore();

  const selectedUserIdRef = useRef(null);

  useEffect(() => {
    // Simula login
    const emailSimulado = 'dan_rodrigo@hotmail.com';
    const filasSimuladas = ['Comercial', 'Suporte'];
    setUserInfo({ email: emailSimulado, filas: filasSimuladas });
  }, [setUserInfo]);

  useEffect(() => {
    audioPlayer.current = new Audio(notificationSound);
    audioPlayer.current.volume = 0.3;
    return () => {
      audioPlayer.current?.pause();
      audioPlayer.current = null;
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
    const initializeApp = async () => {
      try {
        connectSocket();
        const socket = getSocket();

        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setSocketError('Falha na conexão com o servidor. Tentando reconectar...');
        });

        socket.on('connect', () => {
          console.log('Socket conectado com sucesso');
          setSocketError(null);
        });

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
        console.error('Erro na inicialização:', error);
        setSocketError('Erro ao inicializar a aplicação');
      }
    };

    initializeApp();
  }, [loadUnreadCounts, loadLastReadTimes]);

  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = async (message) => {
      setConversation(message.user_id, {
        ...message,
        ticket_number: message.ticket_number || message.ticket,
        timestamp: message.timestamp,
        content: message.content,
        channel: message.channel,
      });

      if (selectedUserIdRef.current !== message.user_id) {
        incrementUnread(message.user_id);
        try {
          audioPlayer.current.currentTime = 0;
          await audioPlayer.current.play();
        } catch (err) {
          console.warn('Erro ao tocar som:', err);
        }

        if (!isWindowActive) {
          const contactName = getContactName(message.user_id);
          showNotification(message, contactName);
        }
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [isWindowActive, setConversation, incrementUnread, getContactName]);

  useEffect(() => {
    if (!selectedUserId) return;

    selectedUserIdRef.current = selectedUserId;
    (async () => {
      await setLastRead(selectedUserId, new Date().toISOString());

      const data = await apiGet(`/messages/${selectedUserId}`);
      if (data) {
        const socket = getSocket();
        socket.emit('join_room', selectedUserId);
        socket.emit('force_refresh', selectedUserId);
      }
    })();
  }, [selectedUserId, setLastRead]);

  const fetchConversations = async () => {
    try {
      const { userEmail, userFilas } = useConversationsStore.getState();
      if (!userEmail || userFilas.length === 0) return;

      const params = new URLSearchParams({
        assigned_to: userEmail,
        filas: userFilas.join(','),
      });

      const data = await apiGet(`/chats?${params.toString()}`);
      data.forEach((conv) => setConversation(conv.user_id, conv));
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
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
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
      return content.length > 50 ? content.slice(0, 47) + '...' : content;
    }
  };

  return (
    <div className="app-container">
      {socketError && <div className="socket-error-banner">{socketError}</div>}

      <aside className="sidebar">
        <Sidebar />
      </aside>

      <main className="chat-container">
        <ChatWindow />
      </main>

      <aside className="details-panel">
        <DetailsPanel />
      </aside>
    </div>
  );
}
