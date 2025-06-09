import React, { useEffect, useRef, useState } from 'react';
import { socket, connectSocket } from '../../services/socket';
import { apiGet } from '../../services/apiClient';

import SendMessageForm from '../SendMessageForm/SendMessageForm';
import MessageList from './MessageList';
import ImageModal from './modals/ImageModal';
import PdfModal from './modals/PdfModal';
import ChatHeader from './ChatHeader';
import './ChatWindow.css';

export default function ChatWindow({ userIdSelecionado }) {
  const [allMessages, setAllMessages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const messageListRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const messageCacheRef = useRef(new Map());

  // Conecta socket ao montar
  useEffect(() => {
    connectSocket();
  }, []);

  // Atualiza usuário ativo
  useEffect(() => {
    currentUserIdRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // Busca mensagens e dados do cliente
  useEffect(() => {
    if (!userIdSelecionado) {
      setAllMessages([]);
      setClienteInfo(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      if (messageCacheRef.current.has(userIdSelecionado)) {
        const cached = messageCacheRef.current.get(userIdSelecionado);
        setAllMessages(cached);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[fetchData] Buscando dados para:', userIdSelecionado);

        const [msgData, clienteRes] = await Promise.all([
          apiGet(`/messages/${encodeURIComponent(userIdSelecionado)}`),
          apiGet(`/clientes/${encodeURIComponent(userIdSelecionado)}`)
        ]);
console.log('📦 Resposta bruta da API (mensagens):', msgData);

        messageCacheRef.current.set(userIdSelecionado, msgData);
        setAllMessages(msgData);
        console.log('🧾 Mensagens definidas no estado:', msgData);

        if (clienteRes?.data) {
          setClienteInfo({
            name: clienteRes.data.name,
            phone: clienteRes.data.phone,
          });
        } else {
          const fallback = msgData[0] || {};
          setClienteInfo({
            name: userIdSelecionado,
            phone: userIdSelecionado.split('@')[0],
            ticket: fallback.ticket || '000000',
            fila: fallback.fila || 'Não definida',
          });
        }
      } catch (err) {
        console.error('❌ Erro ao buscar dados:', err);
        setAllMessages([]);
        setClienteInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userIdSelecionado]);

  // Entra e sai de sala do socket
  useEffect(() => {
    if (!userIdSelecionado) return;
    socket.emit('join_room', userIdSelecionado);
    return () => {
      socket.emit('leave_room', userIdSelecionado);
    };
  }, [userIdSelecionado]);

  // Listener para novas mensagens
  useEffect(() => {
    const handleNewMessage = (novaMsg) => {
      const activeUser = currentUserIdRef.current;
      if (novaMsg.user_id !== activeUser) return;

      setAllMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev;
        const updated = [...prev, novaMsg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        messageCacheRef.current.set(novaMsg.user_id, updated);
        return updated;
      });
    };

    const handleUpdateMessage = (updatedMsg) => {
      const activeUser = currentUserIdRef.current;
      if (updatedMsg.user_id !== activeUser) return;

      setAllMessages((prev) => {
        const updated = prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m);
        messageCacheRef.current.set(updatedMsg.user_id, updated);
        return updated;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('update_message', handleUpdateMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('update_message', handleUpdateMessage);
    };
  }, []);

  if (!userIdSelecionado) {
    return (
      <div className="chat-window placeholder">
        <div className="chat-placeholder">
          <svg className="chat-icon" width="80" height="80" viewBox="0 0 24 24" fill="var(--color-border)">
            <path d="M4 2h16a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H6l-4 4V4a2 2 0 0 1 2 -2z" />
          </svg>
          <h2 className="placeholder-title">Tudo pronto para atender</h2>
          <p className="placeholder-subtitle">Escolha um ticket na lista ao lado para abrir a conversa</p>
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
        <MessageList
          initialKey={userIdSelecionado}
          ref={messageListRef}
          messages={allMessages}
          onImageClick={(url) => setModalImage(url)}
          onPdfClick={(url) => setPdfModal(url)}
          onReply={(msg) => {
            console.log('📨 Respondendo à mensagem:', msg);
            setReplyTo(msg);
          }}
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
