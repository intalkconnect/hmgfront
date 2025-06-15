// App.jsx atualizado com correção de contagem de não lidas
import React, { useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { apiGet, apiPut } from './services/apiClient';
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
    resetUnread,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName,
    conversations,
    notifiedConversations,
    markNotified,
  } = useConversationsStore();

  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);

useEffect(() => {
  let token = new URLSearchParams(window.location.search).get('token');

  if (token) {
    localStorage.setItem('token', token);
    // Limpa a URL após salvar
    window.history.replaceState({}, document.title, '/');
  } else {
    token = localStorage.getItem('token');
  }

  if (!token) {
    console.warn("Nenhum token JWT encontrado");
    return;
  }

  try {
    const decoded = jwtDecode(token);
    const userEmail = decoded.email;

    const fetchUserData = async () => {
      try {
        const data = await apiGet(`/atendentes/${userEmail}`);
        if (data && data.email) {
          setUserInfo({ email: data.email, filas: data.filas || [] });
        }
      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
      }
    };

    fetchUserData();
  } catch (err) {
    console.error("Erro ao decodificar token JWT:", err);
    localStorage.removeItem('token'); // limpa token corrompido
  }
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
  const {
    selectedUserId,
    mergeConversation,
    getContactName,
    notifiedConversations,
    markNotified,
    loadUnreadCounts,
    userEmail, // adiciona aqui
  } = useConversationsStore.getState();

  const isFromMe = message.direction === 'outgoing';
  const isActiveChat = message.user_id === selectedUserId;
  const isWindowFocused = document.hasFocus();

  // ⛔️ Ignora se a mensagem não for atribuída ao usuário atual
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
    return;
  }

  await loadUnreadCounts();

  if (!notifiedConversations[message.user_id] && !isWindowFocused) {
    const contactName = getContactName(message.user_id);
    showNotification(message, contactName);
    markNotified(message.user_id);
  }

  if (isWindowFocused) {
    try {
      if (audioPlayer.current) {
        audioPlayer.current.currentTime = 0;
        await audioPlayer.current.play();
      }
    } catch (e) {
      console.warn('Erro ao reproduzir som:', e);
    }
  }
});


        await Promise.all([
          fetchConversations(),
          loadLastReadTimes(),
          loadUnreadCounts(),
        ]);
      } catch (err) {
        setSocketError('Erro ao inicializar a aplicação');
      }
    };

    initialize();
  }, [selectedUserId, isWindowActive]);

  const fetchConversations = async () => {
    try {
      const { userEmail, userFilas } = useConversationsStore.getState();
      if (!userEmail || userFilas.length === 0) return;

      const params = new URLSearchParams({
        assigned_to: userEmail,
        filas: userFilas.join(','),
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
          const name = getContactName(message.user_id);
          showNotification(message, name);
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
  <div className="app-layout">
    <div className="section-wrapper">
      {socketError && <div className="socket-error-banner">{socketError}</div>}

      <div className="app-container">
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
    </div>
  </div>
);

}
