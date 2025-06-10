// ChatWindow.jsx atualizado com uso de mergeConversation e Zustand
import React, { useEffect, useRef, useState } from 'react';
import { socket, connectSocket } from '../../services/socket';
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
  const setClienteAtivo = useConversationsStore((state) => state.setClienteAtivo);
  const mergeConversation = useConversationsStore((state) => state.mergeConversation);
  const [allMessages, setAllMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const userEmail = useConversationsStore((state) => state.userEmail);
  const userFilas = useConversationsStore((state) => state.userFilas);

  const messageListRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const messageCacheRef = useRef(new Map());
  const loaderRef = useRef(null);
  const [page, setPage] = useState(1);
  const messagesPerPage = 100;

  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    currentUserIdRef.current = userIdSelecionado;
    setPage(1);
  }, [userIdSelecionado]);

  useEffect(() => {
    if (!userIdSelecionado) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [msgRes, clienteRes, ticketRes] = await Promise.all([
          apiGet(`/messages/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/clientes/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/tickets/${encodeURIComponent(userIdSelecionado)}`),
        ]);

        const ticket = ticketRes;
        const isAuthorized =
          ticket.status === 'open' &&
          ticket.assigned_to === userEmail &&
          userFilas.includes(ticket.fila);

        if (!isAuthorized) {
          console.warn('Acesso negado ao ticket deste usuário.');
          return;
        }

        const msgData = msgRes;
        messageCacheRef.current.set(userIdSelecionado, msgData);
        setAllMessages(msgData);
        updateDisplayedMessages(msgData, 1);

        const lastMsg = msgData[msgData.length - 1];
        const canal = lastMsg?.channel || clienteRes?.channel || 'desconhecido';

        mergeConversation(userIdSelecionado, {
          channel: canal,
          ticket_number: clienteRes?.ticket_number || '000000',
          fila: clienteRes?.fila || ticket.fila || 'Orçamento',
          name: clienteRes?.name || userIdSelecionado,
          assigned_to: ticket.assigned_to,
          status: ticket.status,
        });

        const info = {
          name: clienteRes.name,
          phone: clienteRes.phone,
          channel: clienteRes.channel,
          ticket_number: clienteRes.ticket_number,
          fila: clienteRes.fila,
          assigned_to: ticket.assigned_to,
          status: ticket.status,
        };

        setClienteInfo(info);
        setClienteAtivo(info);
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        if (currentUserIdRef.current === userIdSelecionado) {
          setClienteAtivo(null);
          setClienteInfo(null);
          setAllMessages([]);
          setDisplayedMessages([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userIdSelecionado]);

  const updateDisplayedMessages = (messages, currentPage) => {
    const startIndex = Math.max(0, messages.length - currentPage * messagesPerPage);
    const endIndex = messages.length;
    const newMessages = messages.slice(startIndex, endIndex);
    setDisplayedMessages(newMessages);
    setHasMoreMessages(startIndex > 0);
  };

  const loadMoreMessages = () => {
    const newPage = page + 1;
    setPage(newPage);
    updateDisplayedMessages(allMessages, newPage);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages) {
          loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMoreMessages, page]);

  useEffect(() => {
    if (!userIdSelecionado) return;
    socket.emit('join_room', userIdSelecionado);
    return () => {
      socket.emit('leave_room', userIdSelecionado);
    };
  }, [userIdSelecionado]);

  useEffect(() => {
    const handleNewMessage = (novaMsg) => {
      const activeUser = currentUserIdRef.current;
      if (novaMsg.user_id !== activeUser) return;

      setAllMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev;
        const updated = [...prev, novaMsg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        messageCacheRef.current.set(novaMsg.user_id, updated);
        updateDisplayedMessages(updated, page);
        return updated;
      });
    };

    const handleUpdateMessage = (updatedMsg) => {
      const activeUser = currentUserIdRef.current;
      if (updatedMsg.user_id !== activeUser) return;

      setAllMessages((prev) => {
        const updated = prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m));
        messageCacheRef.current.set(updatedMsg.user_id, updated);
        updateDisplayedMessages(updated, page);
        return updated;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('update_message', handleUpdateMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('update_message', handleUpdateMessage);
    };
  }, [page]);

  if (!userIdSelecionado) {
    return (
      <div className="chat-window placeholder">
        <div className="chat-placeholder">
          <svg
            className="chat-icon"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="var(--color-border)"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 2h16a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H6l-4 4V4a2 2 0 0 1 2 -2z" />
          </svg>
          <h2 className="placeholder-title">Tudo pronto para atender</h2>
          <p className="placeholder-subtitle">
            Escolha um ticket na lista ao lado para abrir a conversa
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="chat-window loading">
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <ChatHeader userIdSelecionado={userIdSelecionado} />

      <div className="messages-list">
        {hasMoreMessages && (
          <div ref={loaderRef} className="pagination-loader">
            Carregando mensagens mais antigas...
          </div>
        )}
        <MessageList
          initialKey={userIdSelecionado}
          ref={messageListRef}
          messages={displayedMessages}
          onImageClick={(url) => setModalImage(url)}
          onPdfClick={(url) => setPdfModal(url)}
          onReply={(msg) => setReplyTo(msg)}
        />
      </div>

      <div className="chat-input">
        <SendMessageForm
          userIdSelecionado={userIdSelecionado}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
        />
      </div>

      {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}
      {pdfModal && <PdfModal url={pdfModal} onClose={() => setPdfModal(null)} />}
    </div>
  );
}
