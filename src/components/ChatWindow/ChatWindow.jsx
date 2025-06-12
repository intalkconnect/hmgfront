// src/components/ChatWindow/ChatWindow.jsx
import React, { useEffect, useRef, useState } from 'react';
import { getSocket, connectSocket } from '../../services/socket';
import { apiGet } from '../../services/apiClient';
import useConversationsStore from '../../store/useConversationsStore';

import SendMessageForm from '../SendMessageForm/SendMessageForm';
import MessageList from './MessageList';
import ImageModal from './modals/ImageModal';
import PdfModal from './modals/PdfModal';
import ChatHeader from './ChatHeader';
import './ChatWindow.css';
import './ChatWindowPagination.css';

export default function ChatWindow({ userIdSelecionado }) {
  const setClienteAtivo = useConversationsStore(state => state.setClienteAtivo);
  const mergeConversation = useConversationsStore(state => state.mergeConversation);
  const userEmail = useConversationsStore(state => state.userEmail);
  const userFilas = useConversationsStore(state => state.userFilas);

  const [allMessages, setAllMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const messageCacheRef = useRef(new Map());
  const loaderRef = useRef(null);
  const currentPageRef = useRef(1);
  const messagesPerPage = 100;

  // 1) Conecta socket quando o e-mail estiver disponível
  useEffect(() => {
    if (!userEmail) return;
    connectSocket(userEmail);
    return () => {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
    };
  }, [userEmail]);

  // 2) Reset de paginação ao mudar usuário
  useEffect(() => {
    currentPageRef.current = 1;
  }, [userIdSelecionado]);

  // 3) Busca mensagens, cliente e ticket
  useEffect(() => {
    if (!userIdSelecionado) return;
    setIsLoading(true);
    (async () => {
      try {
        const [msgs, cliente, ticket] = await Promise.all([
          apiGet(`/messages/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/clientes/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/tickets/${encodeURIComponent(userIdSelecionado)}`),
        ]);
        if (
          ticket.status !== 'open' ||
          ticket.assigned_to !== userEmail ||
          !userFilas.includes(ticket.fila)
        ) {
          console.warn('Acesso negado ao ticket deste usuário.');
          setIsLoading(false);
          return;
        }

        messageCacheRef.current.set(userIdSelecionado, msgs);
        setAllMessages(msgs);
        updateDisplayed(msgs, 1);

        mergeConversation(userIdSelecionado, {
          channel: cliente.channel ?? 'desconhecido',
          ticket_number: cliente.ticket_number,
          fila: cliente.fila,
          name: cliente.name,
          assigned_to: ticket.assigned_to,
          status: ticket.status,
        });

        const info = {
          name: cliente.name,
          phone: cliente.phone,
          channel: cliente.channel,
          ticket_number: cliente.ticket_number,
          fila: cliente.fila,
          assigned_to: ticket.assigned_to,
          status: ticket.status,
        };
        setClienteAtivo(info);
      } catch (err) {
        console.error('Erro ao buscar dados do chat:', err);
        setAllMessages([]);
        setDisplayedMessages([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userIdSelecionado, userEmail, userFilas]);

  // Auxiliar de paginação
  const updateDisplayed = (msgs, page) => {
    const start = Math.max(0, msgs.length - page * messagesPerPage);
    setDisplayedMessages(msgs.slice(start));
    setHasMoreMessages(start > 0);
  };

  // Scroll infinito com IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreMessages) {
        const next = currentPageRef.current + 1;
        const all = messageCacheRef.current.get(userIdSelecionado) || [];
        updateDisplayed(all, next);
        currentPageRef.current = next;
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => loaderRef.current && observer.unobserve(loaderRef.current);
  }, [hasMoreMessages, userIdSelecionado]);

  // Eventos de socket: join, leave, new_message, update_message
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userIdSelecionado) return;
    socket.emit('join_room', userIdSelecionado);

    const handleNew = novaMsg => {
      if (novaMsg.user_id !== userIdSelecionado) return;
      setAllMessages(prev => {
        if (prev.some(m => m.id === novaMsg.id)) return prev;
        const updated = [...prev, novaMsg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        messageCacheRef.current.set(userIdSelecionado, updated);
        updateDisplayed(updated, currentPageRef.current);
        return updated;
      });
    };

    const handleUpdate = updatedMsg => {
      if (updatedMsg.user_id !== userIdSelecionado) return;
      setAllMessages(prev => {
        const updated = prev.map(m => m.id === updatedMsg.id ? updatedMsg : m);
        messageCacheRef.current.set(userIdSelecionado, updated);
        updateDisplayed(updated, currentPageRef.current);
        return updated;
      });
    };

    socket.on('new_message', handleNew);
    socket.on('update_message', handleUpdate);

    return () => {
      socket.emit('leave_room', userIdSelecionado);
      socket.off('new_message', handleNew);
      socket.off('update_message', handleUpdate);
    };
  }, [userIdSelecionado]);

  // Renderização
  if (!userIdSelecionado) {
    return (
      <div className="chat-window placeholder">...</div>
    );
  }
  if (isLoading) {
    return (
      <div className="chat-window loading">...</div>
    );
  }

  return (
    <div className="chat-window">
      <ChatHeader userIdSelecionado={userIdSelecionado} />
      <div className="messages-list">
        {hasMoreMessages && <div ref={loaderRef}>Carregando mensagens antigas...</div>}
        <MessageList
          messages={displayedMessages}
          onImageClick={url => setModalImage(url)}
          onPdfClick={url => setPdfModal(url)}
          onReply={msg => setReplyTo(msg)}
        />
      </div>
      <div className="chat-input">
        <SendMessageForm userIdSelecionado={userIdSelecionado} replyTo={replyTo} setReplyTo={setReplyTo} />
      </div>
      {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}
      {pdfModal && <PdfModal url={pdfModal} onClose={() => setPdfModal(null)} />}
    </div>
  );
}
