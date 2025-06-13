import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
let socket;
let listenersAttached = false;
let heartbeatInterval;

export function getSocket() {
  if (!socket) {
    // Debug: imprime todo o estado da store
    const state = useConversationsStore.getState();
    console.log('[socket] Store state:', state);

    // Pega email, suportando tanto 'userEmail' quanto 'email'
    const email = state.userEmail || state.email;
    if (!email) {
      throw new Error('User email not set in store.');
    }

    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      query: { email },
      auth:  { email },
    });
  }
  return socket;
}

export function connectSocket() {
  const socket = getSocket();
  if (!listenersAttached) {
    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket.id);
      heartbeatInterval = setInterval(() => {
        if (socket.connected) socket.emit('heartbeat');
      }, 25000);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[socket] ❌ Disconnected:', reason);
      clearInterval(heartbeatInterval);
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

export function disconnectSocket() {
  const socket = getSocket();
  clearInterval(heartbeatInterval);
  if (socket.connected) socket.disconnect();
}

export { socket };
