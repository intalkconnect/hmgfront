import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
let socket;
let listenersAttached = false;

export function getSocket() {
  if (!socket) {
    throw new Error('Socket não inicializado.');
  }
  return socket;
}

export function connectSocket(userEmail) {
  if (!userEmail) {
    throw new Error('E-mail do usuário é obrigatório para conectar o socket.');
  }
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    reconnectionAttempts: 5,
    auth: { email: userEmail },
  });

  const { setSocketStatus } = useConversationsStore.getState();

  if (!listenersAttached) {
    socket.on('connect', () => {
      console.log('[socket] ✅ Conectado:', socket.id);
      socket.emit('atendente_online');
      setSocketStatus('online');
    });

    socket.on('disconnect', (reason) => {
      console.warn('[socket] ❌ Desconectado:', reason);
      setSocketStatus('offline');
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] Erro de conexão:', err);
      setSocketStatus('offline');
    });

    listenersAttached = true;
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    listenersAttached = false;
  }
}
