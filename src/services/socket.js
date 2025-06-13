import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useConversationsStore from '../store/useConversationsStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export default function useSocket(onMessageCallback) {
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null);
  const { userEmail, setSocketStatus } = useConversationsStore();

  useEffect(() => {
    if (!userEmail) return;

    // Criar nova instância do socket
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      query: { email: userEmail },
      auth: { email: userEmail }
    });

    socketRef.current = socket;

    // Eventos
    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket.id);
      setSocketStatus('online');

      // Heartbeat
      heartbeatRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat');
        }
      }, 25000);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[socket] ❌ Disconnected:', reason);
      setSocketStatus('offline');
      clearInterval(heartbeatRef.current);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err);
      setSocketStatus('offline');
    });

    if (onMessageCallback) {
      socket.on('new_message', onMessageCallback);
    }

    return () => {
      socket.off('new_message', onMessageCallback);
      clearInterval(heartbeatRef.current);
      socket.disconnect();
    };
  }, [userEmail]);

  return socketRef;
}
