import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;
let listenersAttached = false;
let heartbeatInterval = null;
let currentEmail = null;

export function getSocket() {
  const { userEmail } = useConversationsStore.getState();

  // Recria socket se ainda não existir ou email tiver mudado
  if (!socket || userEmail !== currentEmail) {
    if (!SOCKET_URL || !userEmail) {
      throw new Error('Socket URL or userEmail is not defined.');
    }

    currentEmail = userEmail;

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      query: { email: userEmail },
      auth: { email: userEmail }
    });

    listenersAttached = false; // força reanexar listeners
  }

  return socket;
}

export function connectSocket(userEmail) {
  const socket = getSocket();
  const { setSocketStatus } = useConversationsStore.getState();

  if (!listenersAttached) {
    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket.id);

      if (userEmail) {
        socket.emit('join_room', userEmail);
        socket.emit('atendente_online', userEmail);
      }

      setSocketStatus('online');

      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat');
        }
      }, 25000);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[socket] ❌ Disconnected:', reason);
      setSocketStatus('offline');
      clearInterval(heartbeatInterval);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err);
      setSocketStatus('offline');
    });

    listenersAttached = true;
  }

  if (!socket.connected) {
    console.log('[socket] Connecting to', SOCKET_URL);
    socket.connect();
  }

  return () => {
    clearInterval(heartbeatInterval);
  };
}

export function disconnectSocket(userEmail) {
  const socket = getSocket();
  if (socket && socket.connected) {
    if (userEmail) {
      socket.emit('atendente_offline', userEmail);
    }
    clearInterval(heartbeatInterval);
    socket.disconnect();
  }
}

export function reconnectSocket(userEmail) {
  const socket = getSocket();
  if (!socket.connected) {
    connectSocket(userEmail);
  }
}
