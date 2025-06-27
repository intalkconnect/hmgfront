import React, { useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import SocketDisconnectedModal from './components/SocketDisconnectedModal';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

// Helper para decodificar JWT sem dependências externas
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
  const conversations         = useConversationsStore(s => s.conversations);
  const notifiedConversations = useConversationsStore(s => s.notifiedConversations);
  const markNotified          = useConversationsStore(s => s.markNotified);
  const userEmail             = useConversationsStore(s => s.userEmail);
  const userFilas             = useConversationsStore(s => s.userFilas);
  const setSocketStatus       = useConversationsStore(s => s.setSocketStatus);

  const [isWindowActive, setIsWindowActive] = useState(true);

  // 1) Decodifica JWT e busca dados do atendente
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
        if (data?.email) {
          setUserInfo({ email: data.email, filas: data.filas || [] });
        }
      } catch (err) {
        console.error('Erro ao buscar dados do atendente:', err);
      }
    })();
  }, [setUserInfo]);

  // 2) Inicializa som de notificações
  useEffect(() => {
    audioPlayer.current = new Audio(notificationSound);
    audioPlayer.current.volume = 0.3;
    return () => audioPlayer.current?.pause();
  }, []);

  // 3) Monitora foco/blur e solicita permissão de notificação
  useEffect(() => {
    const onFocus = () => setIsWindowActive(true);
    const onBlur = () => setIsWindowActive(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    // Solicita permissão de notificação ao iniciar
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => console.log('🔔 Permissão de notificação:', p));
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 4) Carrega dados e conecta socket
  useEffect(() => {
    if (!userEmail || !userFilas.length) return;
    let mounted = true;
    (async () => {
      try {
        await Promise.all([
          fetchConversations(),
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
          } catch (err) {
            console.error('Erro ao informar sessão ao servidor:', err);
          }
          socket.emit('identify', { email: userEmail, rooms: userFilas });
        });

        socket.on('disconnect', () => setSocketStatus('offline'));
        socket.on('new_message', handleNewMessage);
      } catch (err) {
        console.error('Erro na inicialização:', err);
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
  const handleNewMessage = async (message) => {
    if (message.assigned_to !== userEmail) return;
    const isFromMe       = message.direction === 'outgoing';
    const isActiveChat   = message.user_id === selectedUserId;
    const isWindowFocused = isWindowActive;

    // Atualiza conversa no store
    mergeConversation(message.user_id, {
      ticket_number: message.ticket_number || message.ticket,
      timestamp:     message.timestamp,
      content:       message.content,
      channel:       message.channel,
    });
    if (isFromMe) return;

    if (isActiveChat && isWindowFocused) {
      // Marca como lida no backend e atualiza contagens
      await apiPut(`/messages/read-status/${message.user_id}`, { last_read: new Date().toISOString() });
      await loadUnreadCounts();
    } else {
      // Incrementa badge e atualiza contagens imediatamente
      incrementUnread(message.user_id, message.timestamp);
      await loadUnreadCounts();

      // Notificação visual e sonora apenas com aba inativa
      if (!isWindowFocused && !notifiedConversations[message.user_id]) {
        const contactName = getContactName(message.user_id);
        showNotification(message, contactName);
        try {
          audioPlayer.current.currentTime = 0;
          await audioPlayer.current.play();
        } catch {}
        markNotified(message.user_id);
      }
    }
  };

  // Busca conversas no início
  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams({ assigned_to: userEmail, filas: userFilas.join(',') });
      const data = await apiGet(`/chats?${params.toString()}`);
      data.forEach(conv => mergeConversation(conv.user_id, conv));
    } catch (err) {
      console.error('Erro ao buscar /chats:', err);
    }
  };

  // Notificação visual
  const showNotification = (message, contactName) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(
        `Nova mensagem de ${contactName || message.user_id}`,
        {
          body:    message.content.length > 50 ? message.content.slice(0, 47) + '...' : message.content,
          icon:    '/icons/whatsapp.png',
          vibrate: [200, 100, 200],
        }
      );
      notif.onclick = () => {
        window.focus();
        setSelectedUserId(message.user_id);
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => p === 'granted' && showNotification(message, contactName));
    }
  };

  const conversaSelecionada = selectedUserId ? conversations[selectedUserId] : null;

  return (
    <>
      <SocketDisconnectedModal />
      <div className="app-layout">
        <div className="app-container section-wrapper">
          <aside className="sidebar"><Sidebar/></aside>
          <main className="chat-container">
            <ChatWindow userIdSelecionado={selectedUserId} conversaSelecionada={conversaSelecionada} />
          </main>
          <aside className="details-panel"><DetailsPanel userIdSelecionado={selectedUserId} conversaSelecionada={conversaSelecionada} /></aside>
        </div>
      </div>
    </>
  );
}
