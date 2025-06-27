import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiGet, apiPut } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import SocketDisconnectedModal from './components/SocketDisconnectedModal';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

// Decode JWT helper
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

export default function App() {
  const audioPlayer = useRef(null);
  const socketRef = useRef(null);

  // Zustand selectors
  const selectedUserId        = useConversationsStore(s => s.selectedUserId);
  const setSelectedUserId     = useConversationsStore(s => s.setSelectedUserId);
  const setUserInfo           = useConversationsStore(s => s.setUserInfo);
  const mergeConversation     = useConversationsStore(s => s.mergeConversation);
  const loadUnreadCounts      = useConversationsStore(s => s.loadUnreadCounts);
  const loadLastReadTimes     = useConversationsStore(s => s.loadLastReadTimes);
  const incrementUnread       = useConversationsStore(s => s.incrementUnread);
  const getContactName        = useConversationsStore(s => s.getContactName);
  const markNotified          = useConversationsStore(s => s.markNotified);
  const notifiedConversations = useConversationsStore(s => s.notifiedConversations);
  const userEmail             = useConversationsStore(s => s.userEmail);
  const userFilas             = useConversationsStore(s => s.userFilas);
  const setSocketStatus       = useConversationsStore(s => s.setSocketStatus);
  const conversations         = useConversationsStore(s => s.conversations);

  const [isWindowActive, setIsWindowActive] = useState(true);

  // 1) Parse token and load attendant info
  useEffect(() => {
    let token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, '/');
    } else {
      token = localStorage.getItem('token');
    }
    if (!token) return;

    const { email } = parseJwt(token);
    if (!email) return;

    setUserInfo({ email, filas: [] });
    (async () => {
      try {
        const data = await apiGet(`/atendentes/${email}`);
        if (data?.email) setUserInfo({ email: data.email, filas: data.filas || [] });
      } catch (err) {
        console.error('Erro ao buscar atendente:', err);
      }
    })();
  }, [setUserInfo]);

  // 2) Setup notification sound
  useEffect(() => {
    audioPlayer.current = new Audio(notificationSound);
    audioPlayer.current.volume = 0.3;
    return () => audioPlayer.current?.pause();
  }, []);

  // 3) Track window focus and request notifications
  useEffect(() => {
    const onFocus = () => setIsWindowActive(true);
    const onBlur = () => setIsWindowActive(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 4) Load initial data then connect socket
  useEffect(() => {
    if (!userEmail || !userFilas.length) return;
    let mounted = true;
    (async () => {
      try {
        await Promise.all([
          apiGet(`/chats?${new URLSearchParams({ assigned_to: userEmail, filas: userFilas.join(',') }).toString()}`)
            .then(data => data.forEach(conv => mergeConversation(conv.user_id, conv))),
          loadLastReadTimes(),
          loadUnreadCounts(),
        ]);
        if (!mounted) return;

        connectSocket();
        const socket = getSocket();
        socketRef.current = socket;

        socket.on('connect', async () => {
          setSocketStatus('online');
          const sessionId = socket.id;
          try {
            await apiPut(`/atendentes/session/${userEmail}`, { session: sessionId });
          } catch (e) {
            console.error('Erro informar sessão:', e);
          }
          socket.emit('identify', { email: userEmail, rooms: userFilas });
        });

        socket.on('disconnect', () => setSocketStatus('offline'));
        socket.on('new_message', handleNewMessage);
      } catch (err) {
        console.error('Erro initializing data/socket:', err);
      }
    })();

    return () => {
      mounted = false;
      const socket = getSocket();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message', handleNewMessage);
    };
  }, [userEmail, userFilas]);

  // Handler de nova mensagem
  const handleNewMessage = useCallback(async (message) => {
    if (message.assigned_to !== userEmail) return;
    const isFromMe = message.direction === 'outgoing';
    const isActiveChat = message.user_id === selectedUserId;

    mergeConversation(message.user_id, {
      ticket_number: message.ticket_number || message.ticket,
      timestamp: message.timestamp,
      content: message.content,
      channel: message.channel,
    });
    if (isFromMe) return;

    if (isActiveChat && isWindowActive) {
      await apiPut(`/messages/read-status/${message.user_id}`, { last_read: new Date().toISOString() });
      await loadUnreadCounts();
    } else {
      incrementUnread(message.user_id, message.timestamp);
      await loadUnreadCounts();

      if (!isWindowActive && !notifiedConversations[message.user_id]) {
        const contactName = getContactName(message.user_id);
        showNotification(message, contactName);
        try { audioPlayer.current.currentTime = 0; await audioPlayer.current.play(); } catch {}
        markNotified(message.user_id);
      }
    }
  }, [userEmail, selectedUserId, isWindowActive, notifiedConversations]);

  // Notificação visual
  const showNotification = (message, contactName) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(
        `Nova mensagem de ${contactName || message.user_id}`,
        {
          body: message.content.length > 50 ? `${message.content.slice(0,47)}...` : message.content,
          icon: '/icons/whatsapp.png',
          vibrate: [200,100,200],
        }
      );
      notif.onclick = () => { window.focus(); setSelectedUserId(message.user_id); };
    }
  };

  const conversaSelecionada = conversations[selectedUserId] || null;

  return (
    <>
      <SocketDisconnectedModal />
      <div className="app-layout">
        <aside className="sidebar"><Sidebar/></aside>
        <main className="chat-container"><ChatWindow userIdSelecionado={selectedUserId} /></main>
        <aside className="details-panel"><DetailsPanel userIdSelecionado={selectedUserId} conversaSelecionada={conversaSelecionada}/></aside>
      </div>
    </>
  );
}
