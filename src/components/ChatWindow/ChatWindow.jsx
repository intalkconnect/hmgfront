// src/components/ChatWindow/ChatWindow.jsx

import React, { useEffect, useRef, useState } from 'react';
import { socket, connectSocket } from '../../services/socket';
import { supabase } from '../../services/supabaseClient';
import SendMessageForm from '../SendMessageForm/SendMessageForm';
import MessageList from './MessageList';
import ImageModal from './modals/ImageModal';
import PdfModal from './modals/PdfModal';
import ChatHeader from './ChatHeader';
import './ChatWindow.css';

export default function ChatWindow({ userIdSelecionado, conversaSelecionada }) {
  const [messages, setMessages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);


  const messageListRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const messageCacheRef = useRef(new Map());

  // 1) Conecta socket uma vez
  useEffect(() => {
    connectSocket();
  }, []);

  // 2) Atualiza referência do usuário ativo
  useEffect(() => {
    currentUserIdRef.current = userIdSelecionado;
  }, [userIdSelecionado]);

  // 3) Busca histórico de mensagens + dados do cliente
  useEffect(() => {
    if (!userIdSelecionado) {
      setMessages([]);
      setClienteInfo(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      // Se já tivermos cache, joga direto
      if (messageCacheRef.current.has(userIdSelecionado)) {
        const cachedMessages = messageCacheRef.current.get(userIdSelecionado);
        setMessages(cachedMessages);
        setIsLoading(false);
        return;
      }

      try {
        const [msgRes, clienteRes] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('user_id', userIdSelecionado)
            .order('timestamp', { ascending: true }),
          supabase
            .from('clientes')
            .select('name, phone')
            .eq('user_id', userIdSelecionado)
            .single(),
        ]);

        const msgData = msgRes.data || [];
        messageCacheRef.current.set(userIdSelecionado, msgData);
        setMessages(msgData);

        if (clienteRes.data) {
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
        setMessages([]);
        setClienteInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userIdSelecionado]);

  // 4) Entra/sai da sala de socket
  useEffect(() => {
    if (!userIdSelecionado) return;
    socket.emit('join_room', userIdSelecionado);
    return () => {
      socket.emit('leave_room', userIdSelecionado);
    };
  }, [userIdSelecionado]);

  // 5) Listeners de novas mensagens por socket
  useEffect(() => {
    const handleNewMessage = (novaMsg) => {
      const activeUser = currentUserIdRef.current;
      if (novaMsg.user_id !== activeUser) return;

      setMessages((prev) => {
        if (prev.find((m) => m.id === novaMsg.id)) return prev;
        const updated = [...prev, novaMsg].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        messageCacheRef.current.set(novaMsg.user_id, updated);
        return updated;
      });
    };

    const handleUpdateMessage = (updatedMsg) => {
      const activeUser = currentUserIdRef.current;
      if (updatedMsg.user_id !== activeUser) return;

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === updatedMsg.id ? updatedMsg : m
        );
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

  // 6) Se nenhum contato estiver selecionado → placeholder
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

  // 7) Se estiver carregando, exibe loading
if (isLoading) {
  return (
    <div className="chat-window loading">
      <div className="loading-container">
        <div className="spinner" />
      </div>
    </div>
  );
}


  // 8) Janela de chat com lista de mensagens
  return (
    <div className="chat-window">
      <ChatHeader cliente={conversaSelecionada} />

      <div className="messages-list">
        <MessageList
          // Passamos o userIdSelecionado como "initialKey" para forçar
          // que o List se remonte toda vez que mudamos o contato.
          initialKey={userIdSelecionado}
          ref={messageListRef}
          messages={messages}
          onImageClick={(url) => setModalImage(url)}
          onPdfClick={(url) => setPdfModal(url)}
          onReply={(msg) => {
  console.log('📨 Respondendo à mensagem:', msg); // Verifica o ID aqui
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

      {modalImage && (
        <ImageModal url={modalImage} onClose={() => setModalImage(null)} />
      )}
      {pdfModal && (
        <PdfModal url={pdfModal} onClose={() => setPdfModal(null)} />
      )}
    </div>
  );
}
