import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket;
let listenersAttached = false;

export function getSocket(userEmail) {
  if (!socket) {
    if (!SOCKET_URL) {
      throw new Error('Socket URL is not defined.');
    }

    if (!userEmail) {
      throw new Error('userEmail must be provided to initialize the socket.');
    }

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      query: { email: userEmail },
    });
  }

  return socket;
}

export function connectSocket(userId) {
  const { userEmail, setSocketStatus } = useConversationsStore.getState();
  const socket = getSocket(userEmail);

  if (!listenersAttached) {
    socket.on('connect', () => {
      console.log('[socket] ✅ Conectado:', socket.id);
      if (userId) {
        socket.emit('join_room', userId);
        socket.emit('atendente_online', userId);
      }
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

  if (!socket.connected) {
    console.log('[socket] Conectando a', SOCKET_URL);
    socket.connect();
  }

  return socket;
}

export function disconnectSocket(userId) {
  const socket = getSocket(useConversationsStore.getState().userEmail);
  if (socket && socket.connected) {
    if (userId) {
      socket.emit('atendente_offline', userId);
    }
    socket.disconnect();
  }
}

export function reconnectSocket(userId) {
  const socket = getSocket(useConversationsStore.getState().userEmail);
  if (!socket.connected) {
    connectSocket(userId);
  }
}

export { socket };
