import React, { useEffect } from 'react';
import './SocketDisconnectedModal.css';
import { getSocket } from '../services/socket';
import useConversationsStore from '../store/useConversationsStore';

export default function SocketDisconnectedModal() {
  const socketStatus = useConversationsStore((s) => s.socketStatus);
  const setSocketStatus = useConversationsStore((s) => s.setSocketStatus);
  const userEmail = useConversationsStore((s) => s.userEmail);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setSocketStatus('online');
    const handleDisconnect = () => setSocketStatus('offline');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Check initial state
  // Aguarda 3 segundos antes de marcar offline no load
  const timeout = setTimeout(() => {
    if (!socket.connected) {
      setSocketStatus('offline');
    }
  }, 5000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [setSocketStatus]);

  const reconectar = () => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      if (userEmail) {
        socket.emit('join_room', userEmail);
      }
    }
  };

  if (socketStatus !== 'offline') return null;

  return (
    <div className="socket-modal-overlay">
      <div className="socket-modal">
        <h2>Conexão Perdida</h2>
        <p>Não foi possível se comunicar com o servidor.</p>
        <button onClick={reconectar}>Tentar reconectar</button>
      </div>
    </div>
  );
}
