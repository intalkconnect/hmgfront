import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket;
let listenersAttached = false;
let heartbeatInterval;

export function getSocket() {
  if (!socket) {
    if (!SOCKET_URL) {
      throw new Error('Socket URL is not defined.');
    }

    const userEmail = useConversationsStore((s) => s.userEmail);

    console.log('[socket] Store state:', userEmail);

    const { userEmail } = useConversationsStore.getState();

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      query: { email: userEmail },
      auth: { email: userEmail }
    });
  }

  return socket;
}

export function connectSocket(userId) {
  const socket = getSocket();
  const { setSocketStatus } = useConversationsStore.getState();

  if (!listenersAttached) {
    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket.id);
      if (userId) {
        socket.emit('join_room', userId);
        socket.emit('atendente_online', userId);
      }
      setSocketStatus('online');
      
      // Start heartbeat
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

export function disconnectSocket(userId) {
  const socket = getSocket();
  if (socket && socket.connected) {
    if (userId) {
      socket.emit('atendente_offline', userId);
    }
    clearInterval(heartbeatInterval);
    socket.disconnect();
  }
}

export function reconnectSocket(userId) {
  const socket = getSocket();
  if (!socket.connected) {
    connectSocket(userId);
  }
}

export { socket };
