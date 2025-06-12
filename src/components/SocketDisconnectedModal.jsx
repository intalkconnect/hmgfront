import React, { useEffect } from 'react';
import './SocketDisconnectedModal.css';
import { getSocket } from '../services/socket';
import { apiPut } from '../services/apiClient';
import useConversationsStore from '../store/useConversationsStore';

export default function SocketDisconnectedModal() {
  const socketStatus = useConversationsStore((s) => s.socketStatus);
  const setSocketStatus = useConversationsStore((s) => s.setSocketStatus);
  const userEmail = useConversationsStore((s) => s.userEmail);

  const updateStatus = async (email, status) => {
    try {
      await apiPut(`/atendentes/status/${email}`, { status });
      console.log(`[status] ${email} → ${status}`);
    } catch (err) {
      console.error('Erro ao atualizar status do atendente:', err);
    }
  };

  useEffect(() => {
    if (!userEmail) return;

    const socket = getSocket();

    const handleConnect = () => {
      setSocketStatus('online');
      updateStatus(userEmail, 'online');
    };

    const handleDisconnect = () => {
      setSocketStatus('offline');
      updateStatus(userEmail, 'offline');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const timeout = setTimeout(() => {
      if (!socket.connected) {
        setSocketStatus('offline');
        updateStatus(userEmail, 'offline');
      }
    }, 3000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearTimeout(timeout);
    };
  }, [setSocketStatus, userEmail]);

  const reconectar = () => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      socket.emit('join_room', userEmail);
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
