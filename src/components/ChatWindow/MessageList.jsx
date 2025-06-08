import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import MessageRow from './MessageRow';
import './MessageList.css'; // Importando o CSS adicional

const MessageList = forwardRef(
  ({ messages, onImageClick, onPdfClick, onReply }, ref) => {
    const containerRef = useRef(null);
    const [visibleMessages, setVisibleMessages] = useState(100);
    const loaderRef = useRef(null);

    // Expõe o método scrollToBottomInstant
    useImperativeHandle(ref, () => ({
      scrollToBottomInstant: () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      },
    }));

    // Configura o Intersection Observer para carregar mais mensagens
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && visibleMessages < messages.length) {
            setVisibleMessages(prev => Math.min(prev + 100, messages.length));
          }
        },
        { threshold: 0.1 }
      );

      if (loaderRef.current) {
        observer.observe(loaderRef.current);
      }

      return () => observer.disconnect();
    }, [messages.length, visibleMessages]);

    // Rola para baixo quando novas mensagens são adicionadas
    useEffect(() => {
      if (containerRef.current) {
        const wasAtBottom = 
          containerRef.current.scrollHeight - containerRef.current.scrollTop === 
          containerRef.current.clientHeight;
        
        if (wasAtBottom) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }
    }, [messages]);

    const displayedMessages = messages.slice(-visibleMessages);

    return (
      <div
        ref={containerRef}
        className="message-list-container" // Classe existente
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '0 8px',
        }}
      >
        {visibleMessages < messages.length && (
          <div ref={loaderRef} className="message-list-loader">
            <div className="message-list-spinner"></div>
          </div>
        )}

        {displayedMessages.map((msg, index) => {
          const replyToMessage = messages.find(m => m.whatsapp_message_id === msg.reply_to);
          return (
            <MessageRow
              key={msg.id || index}
              msg={{ ...msg, replyTo: replyToMessage }}
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
