// src/services/socket.js
import { io } from 'socket.io-client'
import useConversationsStore from '../store/useConversationsStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 3,
});

export function connectSocket() {
  if (!socket.connected) {
    console.log('[socket] Conectando em', SOCKET_URL);
    socket.connect();

    socket.on('connect', () => {
      console.log('[socket] Conectado:', socket.id);
    });

    socket.on('new_message', (msg) => {
      const {
        user_id,
        content,
        timestamp,
        channel,
        name,
        ticket_number,
        fila,
      } = msg;

      const {
        setConversation,
        incrementUnread,
        lastRead,
        userIdSelecionadoRef,
      } = useConversationsStore.getState();

      setConversation(user_id, {
        user_id,
        name,
        channel,
        fila,
        ticket_number,
        content,
        timestamp,
      });

      const isOpened = userIdSelecionadoRef?.current === user_id;
      const lastSeen = lastRead[user_id];
      const msgTime = new Date(timestamp).getTime();
      const seenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

      if (!isOpened && msgTime > seenTime) {
        incrementUnread(user_id);
      }
    });

    socket.on('bot_response', (data) => {
      console.log('[socket] Resposta do bot:', data);
    });
  }
}

export function disconnectSocket(userId) {
  if (socket.connected) {
    if (userId) {
      socket.emit('leave_room', userId);
      console.log(`[socket] Saindo da sala ${userId}`);
    }
    socket.disconnect();
  }
}

socket.on('connect_error', (err) => {
  console.error('[socket] Erro ao conectar:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('[socket] Desconectado:', reason);
});
