import React, { useState } from 'react';
import {
  Clipboard, Share2, CheckCircle
} from 'lucide-react';
import './ChatHeader.css';
import useConversationsStore from '../../store/useConversationsStore';
import { apiPut } from '../../services/apiClient';
import TransferModal from './modals/TransferModal';

export default function ChatHeader({ userIdSelecionado }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const clienteAtivo = useConversationsStore((state) => state.clienteAtivo);
  const mergeConversation = useConversationsStore((state) => state.mergeConversation);
  const setSelectedUserId = useConversationsStore((state) => state.setSelectedUserId);

  if (!clienteAtivo) return null;

  const {
    name = 'Cliente',
    ticket_number = '000000',
    fila = 'Indefinida',
    fila_color = '#ccc',
    user_id = userIdSelecionado,
  } = clienteAtivo;

  const finalizarAtendimento = async () => {
    const confirm = window.confirm('Deseja finalizar este atendimento?');
    if (!confirm) return;

    try {
      await apiPut(`/tickets/${user_id}`, { status: 'closed' });
      mergeConversation(user_id, { status: 'closed' });
      setSelectedUserId(null);
    } catch (err) {
      console.error('Erro ao finalizar ticket:', err);
      alert('Erro ao finalizar atendimento.');
    }
  };

  return (
    <>
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="cliente-nome">{name}</div>

          <div className="cliente-detalhes">
            <div className="ticket-box">
              <Clipboard size={16} className="detalhe-icon" />
              <span className="ticket-text">#{ticket_number}</span>
            </div>

            <div className="chat-queue-badge" style={{ backgroundColor: fila_color }}>
              {fila}
            </div>
          </div>
        </div>

        <div className="chat-header-right">
          <button className="btn-transferir" onClick={() => setShowTransferModal(true)}>
            <Share2 size={14} />
            <span>Transferir</span>
          </button>
          <button className="btn-finalizar" onClick={finalizarAtendimento}>
            <CheckCircle size={14} />
            <span>Finalizar</span>
          </button>
        </div>
      </div>

      {showTransferModal && (
        <TransferModal
          userId={user_id}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </>
  );
}
