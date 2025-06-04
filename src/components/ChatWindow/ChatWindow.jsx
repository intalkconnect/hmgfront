// src/components/ChatWindow/ChatWindow.jsx
import React, { useEffect, useRef, useState } from 'react';
import { socket, connectSocket } from '../../services/socket';
import SendMessageForm from '../SendMessageForm';
import { supabase } from '../../services/supabaseClient';
import './ChatWindow.css';

import MessageList from './MessageList';
import ImageModal from './modals/ImageModal';
import PdfModal from './modals/PdfModal';

export default function ChatWindow({ userIdSelecionado }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);

  const messagesEndRef = useRef(null);
  const currentUserIdRef = useRef(null);

  // 1) Conecta socket
  useEffect(() => {
    connectSocket();
  }, []);

  // 2) Atualiza referência do usuário atual
  useEffect(() => {
    currentUserIdRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // 3) Busca histórico
  useEffect(() => {
    if (!userIdSelecionado) return;

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('messages')
      .select('*')
      .eq('user_id', userIdSelecionado)
      .order('timestamp', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Erro ao buscar mensagens:', error);
        } else if (isMounted) {
          setMessages(data);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userIdSelecionado]);

  // 4) Join/leave room no socket
  useEffect(() => {
    if (!userIdSelecionado) return;
    socket.emit('join_room', userIdSelecionado);
    return () => {
      socket.emit('leave_room', userIdSelecionado);
    };
  }, [userIdSelecionado]);

  // 5) Listeners de new_message e update_message
  useEffect(() => {
    const handleNewMessage = (novaMsg) => {
      const activeUser = currentUserIdRef.current;
      if (novaMsg.user_id !== activeUser) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev;
        return [...prev, novaMsg].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    };
    const handleUpdateMessage = (updatedMsg) => {
      const activeUser = currentUserIdRef.current;
      if (updatedMsg.user_id !== activeUser) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('update_message', handleUpdateMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('update_message', handleUpdateMessage);
    };
  }, []);

  // 6) Scroll automático
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!userIdSelecionado) {
    return (
      <div className="chat-window no-conversa">
        <p>Selecione uma conversa</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Cabeçalho */}
      <header className="chat-header">
        <h2>{userIdSelecionado}</h2>
      </header>

      {/* Lista de mensagens */}
      <div className="messages-list">
        {isLoading ? (
          <p>Carregando mensagens...</p>
        ) : (
          <MessageList
            messages={messages}
            onImageClick={(url) => setModalImage(url)}
            onPdfClick={(url) => setPdfModal(url)}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Campo de input */}
      <div className="chat-input">
        <SendMessageForm userIdSelecionado={userIdSelecionado} />
      </div>

      {/* Modal de imagem */}
      {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}

      {/* Modal de PDF */}
      {pdfModal && <PdfModal url={pdfModal} onClose={() => setPdfModal(null)} />}
    </div>
  );
}
