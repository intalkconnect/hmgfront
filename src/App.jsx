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

  const userEmail = useConversationsStore((s) => s.userEmail);
  const userFilas = useConversationsStore((s) => s.userFilas);

  // Handler de nova mensagem
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

  // Define usuário e filas
  useEffect(() => {
    setUserInfo({
      email: 'dan_rodrigo@hotmail.com',
      filas: ['Comercial', 'Suporte'],
    });
  }, [setUserInfo]);

  // Inicializa player de som
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

  // Conecta socket após email
  useEffect(() => {
    if (!userEmail) return;
    const cleanup = connectSocket();
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
      cleanup();
    };
  }, [userEmail]);

  // Notifica offline ao fechar a aba
  useEffect(() => {
    if (!userEmail) return;
    const notifyOffline = () => {
      navigator.sendBeacon(
        `/api/v1/atendentes/status/${encodeURIComponent(userEmail)}`,
        JSON.stringify({ status: 'offline' })
      );
    };
    window.addEventListener('beforeunload', notifyOffline);
    return () => window.removeEventListener('beforeunload', notifyOffline);
  }, [userEmail]);

  const fetchConversations = async () => {
    if (!userEmail || !userFilas?.length) return;
    try {
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
    const preview = (() => {
      try {
        const j = JSON.parse(message.content);
        return j.text || j.caption || '[File]';
      } catch {
        return message.content.length > 50
          ? message.content.slice(0, 47) + '...'
          : message.content;
      }
    })();
    if (Notification.permission === 'granted') {
      const n = new Notification(
        `New message from ${contactName}`,
        { body: preview, icon: '/icons/whatsapp.png' }
      );
      n.onclick = () => {
        window.focus();
        setSelectedUserId(message.user_id);
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') showNotification(message, contactName);
      });
    }
  };

  const conversaSelecionada = selectedUserId
    ? conversations[selectedUserId]
    : null;

  return (
    <div className="app-container">
      <SocketDisconnectedModal />
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <main className="chat-container">
        <ChatWindow
          userIdSelecionado={selectedUserId}
          conversaSelecionada={conversaSelecionada}
        />
      </main>
      <aside className="details-panel">
        <DetailsPanel
          userIdSelecionado={selectedUserId}
          conversaSelecionada={conversaSelecionada}
        />
      </aside>
    </div>
  );
}
