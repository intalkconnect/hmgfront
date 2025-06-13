import React, { useEffect, useRef } from 'react';
import { apiGet, apiPut } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import SocketDisconnectedModal from './components/SocketDisconnectedModal';
import './App.css';

export default function App() {
  const audioPlayer = useRef(null);
  const socketRef = useRef(null);

  const userEmail = useConversationsStore((s) => s.userEmail);
  const userFilas = useConversationsStore((s) => s.userFilas);
  const {
    selectedUserId,
    setSelectedUserId,
    setUserInfo,
    mergeConversation,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName,
    conversations,
    notifiedConversations,
    markNotified,
  } = useConversationsStore();

  // Handler isolado para facilitar cleanup
  const handleNewMessage = async (message) => {
    const {
      selectedUserId: activeId,
      mergeConversation,
      getContactName,
      notifiedConversations,
      markNotified,
      loadUnreadCounts,
    } = useConversationsStore.getState();

    const isFromMe = message.direction === 'outgoing';
    const isActiveChat = message.user_id === activeId;

    mergeConversation(message.user_id, {
      ticket_number: message.ticket_number || message.ticket,
      timestamp: message.timestamp,
      content: message.content,
      channel: message.channel,
    });

    if (isFromMe) return;
    if (isActiveChat) {
      await apiPut(`/messages/read-status/${message.user_id}`, {
        last_read: new Date().toISOString(),
      });
      return;
    }

    await loadUnreadCounts();
    if (!notifiedConversations[message.user_id]) {
      const contactName = getContactName(message.user_id);
      showNotification(message, contactName);
      markNotified(message.user_id);
    }

    try {
      if (audioPlayer.current) {
        audioPlayer.current.currentTime = 0;
        await audioPlayer.current.play();
      }
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  };

  // Seta info do usuário apenas uma vez
  useEffect(() => {
    setUserInfo({
      userEmail: 'dan_rodrigo@hotmail.com',
      userFilas: ['Comercial', 'Suporte'],
    });
  }, [setUserInfo]);

  // Inicializa player de som apenas uma vez
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

  // Conecta socket só quando userEmail estiver disponível
  useEffect(() => {
    if (!userEmail) return;

    const cleanupSocket = connectSocket();
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('new_message', handleNewMessage);

    (async () => {
      await Promise.all([
        fetchConversations(),
        loadLastReadTimes(),
        loadUnreadCounts(),
      ]);
    })();

    return () => {
      socket.off('new_message', handleNewMessage);
      cleanupSocket();
    };
  }, [userEmail]);

  const fetchConversations = async () => {
    try {
      if (!userEmail || userFilas.length === 0) return;
      const params = new URLSearchParams({
        assigned_to: userEmail,
        filas: userFilas.join(','),
      });
      const data = await apiGet(`/chats?${params.toString()}`);
      data.forEach((conv) => mergeConversation(conv.user_id, conv));
    } catch (err) {
      console.error('Error fetching /chats:', err);
    }
  };

  const showNotification = (message, contactName) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notification = new Notification(
        `New message from ${contactName || message.user_id}`,
        { body: getMessagePreview(message.content), icon: '/icons/whatsapp.png' }
      );
      notification.onclick = () => {
        window.focus();
        setSelectedUserId(message.user_id);
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') showNotification(message, getContactName(message.user_id));
      });
    }
  };

  const getMessagePreview = (content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.text) return parsed.text;
      if (parsed.caption) return parsed.caption;
      if (parsed.url) return '[File]';
      return '[Message]';
    } catch {
      return content?.length > 50 ? content.substring(0, 47) + '...' : content;
    }
  };

  const conversaSelecionada = selectedUserId
    ? conversations[selectedUserId] || null
    : null;

  return (
    <div className="app-container">
      <SocketDisconnectedModal />
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
