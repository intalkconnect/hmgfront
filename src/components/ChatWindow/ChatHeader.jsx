import React from 'react';
import {
  Clipboard, Folder, Navigation, Phone,
  Share2, CheckCircle
} from 'lucide-react';
import './ChatHeader.css';
import useConversationsStore from '../../store/useConversationsStore';
import { apiPut } from '../../services/apiClient';

export default function ChatHeader({ userIdSelecionado }) {
  const clienteAtivo = useConversationsStore((state) => state.clienteAtivo);
  const mergeConversation = useConversationsStore((state) => state.mergeConversation);

  if (!clienteAtivo) return null;

  const {
    name = 'Cliente',
    ticket_number = '000000',
    fila = 'Indefinida',
    user_id = userIdSelecionado,
    channel = 'desconhecido',
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
    <div className="chat-header">
      {/* Lado esquerdo: nome e detalhes */}
      <div className="chat-header-left">
        <div className="cliente-nome">{name}</div>

        <div className="cliente-detalhes">
          <div className="detalhe-item">
            <Clipboard size={16} className="detalhe-icon" />
            <span className="detalhe-texto">Ticket: #{ticket_number}</span>
          </div>
          <div className="detalhe-item">
            <Folder size={16} className="detalhe-icon" />
            <span className="detalhe-texto">Fila: {fila}</span>
          </div>
          <div className="detalhe-item">
            <Navigation size={16} className="detalhe-icon" />
            <span className="detalhe-texto">Origem: {channel}</span>
          </div>
          <div className="detalhe-item">
            <Phone size={16} className="detalhe-icon" />
            <span className="detalhe-texto">{user_id}</span>
          </div>
        </div>
      </div>

      {/* Lado direito: botões de ação */}
      <div className="chat-header-right">
        <button className="btn-transferir">
          <Share2 size={14} />
          <span>Transferir</span>
        </button>
        <button className="btn-finalizar" onClick={finalizarAtendimento}>
          <CheckCircle size={14} />
          <span>Finalizar</span>
        </button>
      </div>
    </div>
  );
}
