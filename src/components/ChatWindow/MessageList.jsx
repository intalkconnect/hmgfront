// src/components/ChatWindow/MessageList.jsx

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import MessageRow from './MessageRow';

/**
 * MessageList (versão “carrega tudo”)
 *
 * - Renderiza todas as mensagens de uma só vez usando map().
 * - O scroll fica a cargo do navegador (overflow-y: auto), sem virtualização.
 * - Expondo via ref() o método scrollToBottomInstant() para rolar automaticamente.
 *
 * Props:
 *  - messages: array de objetos de mensagem ({ id, direction, content, timestamp, status, ... })
 *  - onImageClick, onPdfClick, onReply: callbacks para tratar anexos e resposta
 */

const MessageList = forwardRef(
  ({ messages, onImageClick, onPdfClick, onReply }, ref) => {
    // Referência ao container que faz o scroll
    const containerRef = useRef(null);

    // Expondo o método scrollToBottomInstant() para o componente pai
    useImperativeHandle(ref, () => ({
      scrollToBottomInstant: () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      },
    }));

    // Sempre que o array “messages” mudar, rola automaticamente para o fim
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [messages]);

    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,                   // ocupa todo espaço vertical disponível
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',         // scroll aparece aqui, não em outro lugar
          padding: '0 8px',          // opcional: gap lateral igual ao que tinha antes
        }}
      >
{messages.map((msg, index) => {
  const replyToMessage = messages.find(m => m.whatsapp_message_id === msg.reply_to);

  return (
    <MessageRow
      key={msg.id || index}
      msg={{ ...msg, replyTo: replyToMessage }} // injeta o conteúdo da mensagem original
      onImageClick={onImageClick}
      onPdfClick={onPdfClick}
      onReply={onReply}
    />
  );
})}

      </div>
    );
  }
);

export default MessageList;
