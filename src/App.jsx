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
  const getContactName        = useConversationsStore(s => s.getContactName);
  const conversations         = useConversationsStore(s => s.conversations);
  const notifiedConversations = useConversationsStore(s => s.notifiedConversations);
  const markNotified          = useConversationsStore(s => s.markNotified);
  const userEmail             = useConversationsStore(s => s.userEmail);
  const userFilas             = useConversationsStore(s => s.userFilas);
  const socketStatus          = useConversationsStore(s => s.socketStatus);
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

  // 3) Monitora foco/blur para controle de notificações
  useEffect(() => {
    const onFocus = () => setIsWindowActive(true);
    const onBlur = () => setIsWindowActive(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 4) Conecta socket e registra listeners
  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    socketRef.current = socket;

    // Conexão estabelecida
    socket.on('connect', async () => {
      setSocketStatus('online');
      if (userEmail && userFilas.length) {
        const sessionId = socket.id;
        // envia sessão via API
        try {
          await apiPut(`/atendentes/session/${userEmail}`, { session: sessionId });
        } catch (err) {
          console.error('Erro ao informar sessão ao servidor:', err);
        }
        // identifica no socket
        socket.emit('identify', { email: userEmail, rooms: userFilas });
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      setSocketStatus('offline');
    });

    // Nova mensagem
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message', handleNewMessage);
    };
  }, [userEmail, userFilas, setSocketStatus]);

  // 5) Quando email/filas chegarem, carrega conversas e status
  useEffect(() => {
    if (!userEmail || userFilas.length === 0) return;
    (async () => {
      try {
        await Promise.all([
          fetchConversations(),
          loadLastReadTimes(),
          loadUnreadCounts(),
        ]);
      } catch (err) {
        console.error('Erro ao inicializar dados:', err);
      }
    })();
  }, [userEmail, userFilas, loadLastReadTimes, loadUnreadCounts]);

  // Handler de nova mensagem
  const handleNewMessage = async (message) => {
    const isFromMe = message.direction === 'outgoing';
    const isActiveChat = message.user_id === selectedUserId;
    const isWindowFocused = isWindowActive;

    if (message.assigned_to !== userEmail) return;
    mergeConversation(message.user_id, {
      ticket_number: message.ticket_number || message.ticket,
      timestamp: message.timestamp,
      content: message.content,
      channel: message.channel,
    });
    if (isFromMe) return;

    if (isActiveChat && isWindowFocused) {
      await apiPut(`/messages/read-status/${message.user_id}`, {
        last_read: new Date().toISOString(),
      });
    } else {
      await loadUnreadCounts();
      if (!notifiedConversations[message.user_id] && !isWindowFocused) {
        const contactName = getContactName(message.user_id);
        showNotification(message, contactName);
        markNotified(message.user_id);
      }
    }

    if (isWindowActive) {
      try {
        audioPlayer.current.currentTime = 0;
        await audioPlayer.current.play();
      } catch {}
    }
  };

  // Busca todas as conversas atribuídas ao atendente
  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams({ assigned_to: userEmail, filas: userFilas.join(',') });
      const data = await apiGet(`/chats?${params.toString()}`);
      data.forEach((conv) => mergeConversation(conv.user_id, conv));
    } catch (err) {
      console.error('Erro ao buscar /chats:', err);
    }
  };

  // Exibe notificações do browser
  const showNotification = (message, contactName) => {
    if (isWindowActive || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(
        `Nova mensagem de ${contactName || message.user_id}`,
        { body: getMessagePreview(message.content), icon: '/icons/whatsapp.png', vibrate: [200, 100, 200] }
      );
      notif.onclick = () => { window.focus(); setSelectedUserId(message.user_id); };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => p === 'granted' && showNotification(message, contactName));
    }
  };

  // Gera preview de mensagem
  const getMessagePreview = (content) => {
    try {
      const parsed = JSON.parse(content);
      return parsed.text || parsed.caption || '[Arquivo]';
    } catch {
      return content.length > 50 ? content.slice(0, 47) + '...' : content;
    }
  };

  const conversaSelecionada = selectedUserId ? conversations[selectedUserId] : null;

  return (
    <>
      <SocketDisconnectedModal />
      <div className="app-layout">
        <div className="app-container section-wrapper">
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
      </div>
    </>
  );
}
