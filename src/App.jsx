import React, { useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from './services/apiClient';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
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
    resetUnread,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName,
    conversations,
    notifiedConversations,
    markNotified,
    userEmail,
    userFilas,
  } = useConversationsStore();

  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);

  // 1) Configura email e filas
  useEffect(() => {
    setUserInfo({
      email: 'dan_rodrigo@hotmail.com',
      filas: ['Comercial', 'Suporte'],
    });
  }, [setUserInfo]);

  // 2) Inicializa áudio de notificação
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

  // 3) Foco da janela
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

  // 4) Conecta socket ao mudar userEmail
  useEffect(() => {
    if (!userEmail) return;
    // Conectar e guardar instância
    const socket = connectSocket(userEmail);
    socketRef.current = socket;

    socket.on('connect_error', () => {
      setSocketError('Falha na conexão com o servidor. Tentando reconectar...');
    });

    socket.on('connect', () => {
      setSocketError(null);
    });

    socket.on('new_message', async (message) => {
      const state = useConversationsStore.getState();
      const isFromMe = message.direction === 'outgoing';
      const isActiveChat = message.user_id === state.selectedUserId;
      const isWindowFocused = document.hasFocus();

      mergeConversation(message.user_id, {
        ticket_number: message.ticket_number || message.ticket,
        timestamp: message.timestamp,
        content: message.content,
        channel: message.channel,
      });

      if (isFromMe) return;

      // Marca como lida se chat ativo e janela em foco
      if (isActiveChat && isWindowFocused) {
        await apiPut(`/messages/read-status/${message.user_id}`, {
          last_read: new Date().toISOString(),
        });
        return;
      }

      await loadUnreadCounts();

      if (!state.notifiedConversations[message.user_id] && !isWindowFocused) {
        const contactName = getContactName(message.user_id);
        showNotification(message, contactName);
        markNotified(message.user_id);
      }

      if (isWindowFocused) {
        try {
          audioPlayer.current.currentTime = 0;
          await audioPlayer.current.play();
        } catch (e) {
          console.warn('Erro ao reproduzir som:', e);
        }
      }
    });

    // Cleanup no unmount ou troca de userEmail
    return () => {
      disconnectSocket();
    };
  }, [userEmail]);

  // 5) Detecta logout/fechamento de aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnectSocket();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 6) Busca conversas iniciais
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchConversations(),
          loadLastReadTimes(),
          loadUnreadCounts(),
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    if (userEmail && userFilas.length) {
      initialize();
    }
  }, [userEmail, userFilas]);

  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams({
        assigned_to: userEmail,
        filas: userFilas.join(','),
      });
      const data = await apiGet(`/chats?${params}`);
      data.forEach((conv) => mergeConversation(conv.user_id, conv));
    } catch (err) {
      console.error('Erro ao buscar /chats:', err);
    }
  };

  const showNotification = (message, contactName) => {
    if (isWindowActive) return;
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
          showNotification(message, getContactName(message.user_id));
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
      return content?.length > 50
        ? content.substring(0, 47) + '...'
        : content;
    }
  };

  const conversaSelecionada = selectedUserId
    ? conversations[selectedUserId] || null
    : null;

  return (
    <div className="app-container">
      <SocketDisconnectedModal error={socketError} />
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
