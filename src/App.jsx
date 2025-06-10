// App.jsx - Versão Refatorada
import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { apiGet } from './services/apiClient';
import { connectSocket, getSocket } from './services/socket';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/ChatWindow/ChatWindow';
import DetailsPanel from './components/DetailsPanel/DetailsPanel';
import useConversationsStore from './store/useConversationsStore';
import notificationSound from './assets/notification.mp3';
import './App.css';

// Componente de Estado Vazio
const EmptyState = () => (
  <div className="empty-state">
    <img src="/icons/select-chat.svg" alt="Selecione uma conversa" />
    <p>Selecione uma conversa para começar</p>
  </div>
);

// Notificação Segura
const showNotification = (message, contactName, onSelect) => {
  if (!('Notification' in window)) return;

  const getMessagePreview = (content) => {
    if (typeof content !== 'string') return '[Mídia]';
    try {
      const parsed = JSON.parse(content);
      return parsed.text || parsed.caption || '[Arquivo]';
    } catch {
      return DOMPurify.sanitize(content.substring(0, 50));
    }
  };

  if (Notification.permission === 'granted') {
    new Notification(`Nova mensagem de ${contactName || message.user_id}`, {
      body: getMessagePreview(message.content),
      icon: '/icons/whatsapp.png'
    }).onclick = () => onSelect(message.user_id);
  }
};

export default function App() {
  const audioPlayer = useRef(null);
  const socketRef = useRef(null);
  const [socketError, setSocketError] = useState(null);
  const [isWindowActive, setIsWindowActive] = useState(true);

  const {
    selectedUserId,
    setSelectedUserId,
    userEmail,
    userFilas,
    conversations,
    setConversations,
    mergeConversation,
    incrementUnread,
    loadUnreadCounts,
    loadLastReadTimes,
    getContactName
  } = useConversationsStore();

  // Inicialização fixa do usuário
  useConversationsStore.getState().setUserInfo({
    email: 'dan_rodrigo@hotmail.com',
    filas: ['Comercial', 'Suporte']
  });

  // Configuração de áudio com fallback
  useEffect(() => {
    audioPlayer.current = new Audio(notificationSound);
    audioPlayer.current.volume = 0.3;
    
    return () => {
      audioPlayer.current?.pause();
    };
  }, []);

  // Gerenciamento de foco da janela
  useEffect(() => {
    const handlers = {
      focus: () => setIsWindowActive(true),
      blur: () => setIsWindowActive(false)
    };

    window.addEventListener('focus', handlers.focus);
    window.addEventListener('blur', handlers.blur);
    return () => {
      window.removeEventListener('focus', handlers.focus);
      window.removeEventListener('blur', handlers.blur);
    };
  }, []);

  // Socket Service
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const handleNewMessage = (message) => {
      mergeConversation(message.user_id, {
        ticket_number: message.ticket_number || message.ticket,
        timestamp: message.timestamp,
        content: message.content,
        channel: message.channel,
      });

      if (selectedUserId !== message.user_id) {
        incrementUnread(message.user_id);
        playNotification();
        
        if (!isWindowActive) {
          showNotification(
            message, 
            getContactName(message.user_id),
            setSelectedUserId
          );
        }
      }
    };

    const playNotification = async () => {
      try {
        audioPlayer.current.currentTime = 0;
        await audioPlayer.current.play();
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          console.warn('Autoplay bloqueado. Clique para ativar sons.');
        }
      }
    };

    socket.on('connect_error', () => {
      setSocketError('Falha na conexão. Reconectando...');
    });

    socket.on('connect', () => setSocketError(null));
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('connect_error');
      socket.off('new_message', handleNewMessage);
    };
  }, [selectedUserId, isWindowActive, mergeConversation, incrementUnread, getContactName, setSelectedUserId]);

  // Data Loader
  useEffect(() => {
    const fetchConversations = async () => {
      if (!userEmail || !userFilas?.length) return;

      try {
        const params = new URLSearchParams({
          assigned_to: userEmail,
          filas: userFilas.join(',')
        });

        const data = await apiGet(`/chats?${params.toString()}`);
        const batchUpdate = data.reduce((acc, conv) => ({ 
          ...acc, 
          [conv.user_id]: conv 
        }), {});

        setConversations(batchUpdate);
      } catch (err) {
        console.error('Erro ao buscar conversas:', err);
      }
    };

    const initialize = async () => {
      await Promise.all([
        fetchConversations(),
        loadLastReadTimes(),
        loadUnreadCounts()
      ]);
    };

    initialize();
  }, [userEmail, userFilas, setConversations, loadLastReadTimes, loadUnreadCounts]);

  const conversaSelecionada = selectedUserId ? conversations[selectedUserId] : null;

  return (
    <div className="app-container">
      {socketError && (
        <div className="socket-error-banner">
          {socketError}
        </div>
      )}

      <aside className="sidebar">
        <Sidebar />
      </aside>

      <main className="chat-container">
        {selectedUserId ? (
          <ChatWindow 
            userIdSelecionado={selectedUserId} 
            conversaSelecionada={conversaSelecionada} 
          />
        ) : (
          <EmptyState />
        )}
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
