// --- src/components/ChatWindow/ChatWindow.jsx ---
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
  // Zustand selectors
  const setClienteAtivo = useConversationsStore(state => state.setClienteAtivo);
  const mergeConversation = useConversationsStore(state => state.mergeConversation);
  const userEmail = useConversationsStore(state => state.userEmail);
  const userFilas = useConversationsStore(state => state.userFilas);

  // state
  const [allMessages, setAllMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // refs
  const messageListRef = useRef(null);
  const loaderRef = useRef(null);
  const messageCacheRef = useRef(new Map());
  const currentPageRef = useRef(1);
  const messagesPerPage = 100;

  // 1) conecta socket
  useEffect(() => {
    connectSocket(userEmail);
    const socket = getSocket();
    return () => {
      if (socket?.connected) socket.disconnect();
    };
  }, [userEmail]);

  // 2) reset paginação na troca de usuário
  useEffect(() => {
    if (userIdSelecionado) currentPageRef.current = 1;
  }, [userIdSelecionado]);

  // 3) fetch dados de chat, cliente e ticket
  useEffect(() => {
    if (!userIdSelecionado) return;
    setIsLoading(true);
    (async () => {
      try {
        const [msgRes, clienteRes, ticketRes] = await Promise.all([
          apiGet(`/messages/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/clientes/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/tickets/${encodeURIComponent(userIdSelecionado)}`),
        ]);

        // autorização
        const ticket = ticketRes;
        if (
          ticket.status !== 'open' ||
          ticket.assigned_to !== userEmail ||
          !userFilas.includes(ticket.fila)
        ) {
          console.warn('Acesso negado ao ticket deste usuário.');
          return;
        }

        // cache e estado
        messageCacheRef.current.set(userIdSelecionado, msgRes);
        setAllMessages(msgRes);
        updateDisplayed(msgRes, 1);

        // merge conversa
        mergeConversation(userIdSelecionado, {
          channel: clienteRes.channel || 'desconhecido',
          ticket_number: clienteRes.ticket_number,
          fila: clienteRes.fila,
          name: clienteRes.name,
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
        setClienteInfo(null);
        setAllMessages([]);
        setDisplayedMessages([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userIdSelecionado, userEmail, userFilas]);

  // helper para paginação
  const updateDisplayed = (msgs, page) => {
    const start = Math.max(0, msgs.length - page * messagesPerPage);
    setDisplayedMessages(msgs.slice(start));
    setHasMoreMessages(start > 0);
  };

  // IntersectionObserver para scroll infinito
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
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [hasMoreMessages, userIdSelecionado]);

  // eventos de socket: join, leave, new/update
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join_room', userIdSelecionado);

    const handleNew = novaMsg => {
      if (novaMsg.user_id !== userIdSelecionado) return;
      setAllMessages(prev => {
        if (prev.some(m => m.id === novaMsg.id)) return prev;
        const updated = [...prev, novaMsg].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
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

  // renderização
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
          onImageClick={url => setModalImage(url)}
          onPdfClick={url => setPdfModal(url)}
          onReply={msg => setReplyTo(msg)}
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
