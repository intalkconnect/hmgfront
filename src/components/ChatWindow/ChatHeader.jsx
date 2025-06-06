import React from 'react';
import { Clipboard, Folder, Navigation, Phone, Share2, CheckCircle } from 'lucide-react';
import './ChatHeader.css';

/**
 * Props esperadas em `cliente`:
 * {
 *   name: string,
 *   ticket: string | number,
 *   fila: string,
 *   phone: string,
 *   channel: string       // este campo será exibido como “Origem”
 * }
 */
export default function ChatHeader({ cliente }) {
  // Se não houver dados do cliente, não renderiza
  if (!cliente) return null;

  const { name, ticket_number, fila, phone, channel } = cliente;

  return (
    <div className="chat-header">
      {/* Lado esquerdo: nome e detalhes */}
      <div className="chat-header-left">
        {/* Nome do cliente */}
        <div className="cliente-nome">{name}</div>

        {/* Bloco de detalhes: ticket, fila, origem e telefone */}
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
            <span className="detalhe-texto">{phone}</span>
          </div>
        </div>
      </div>

      {/* Lado direito: botões de ação (Transferir / Finalizar) */}
      <div className="chat-header-right">
        <button className="btn-transferir">
          <Share2 size={14} />
          <span>Transferir</span>
        </button>
        <button className="btn-finalizar">
          <CheckCircle size={14} />
          <span>Finalizar</span>
        </button>
      </div>
    </div>
  );
}
