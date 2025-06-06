  // src/components/ChatWindow/MessageRow.jsx

  import React from 'react';
  import TextMessage from './messageTypes/TextMessage';
  import ImageMessage from './messageTypes/ImageMessage';
  import DocumentMessage from './messageTypes/DocumentMessage';
  import ListMessage from './messageTypes/ListMessage';
  import AudioMessage from './messageTypes/AudioMessage';
  import UnknownMessage from './messageTypes/UnknownMessage';
  import './MessageRow.css';
  import { CheckCheck, Check } from 'lucide-react';

  export default function MessageRow({ msg, onImageClick, onPdfClick, onReply }) {
    let content = msg.content;
    
    // Parse do conteúdo JSON se necessário
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        // se não for JSON válido, mantém como string
      }
    }

    const isOutgoing = msg.direction === 'outgoing';
    const rowClass = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
    const bubbleClass = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const renderTimeAndStatus = () => (
      <div className="message-time">
        {new Date(msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {isOutgoing && (
          <span className="message-status">
            {msg.status === 'delivered' ? (
              <CheckCheck size={14} className="check delivered" />
            ) : msg.status === 'sent' ? (
              <CheckCheck size={14} className="check sent" />
            ) : (
              <Check size={14} className="check pending" />
            )}
          </span>
        )}
      </div>
    );

    // Determina o tipo de conteúdo
    const urlLower = String(content?.url || '').toLowerCase();
    const isAudio = msg.type === 'audio' || content?.voice || /\.(ogg|mp3|wav)$/i.test(urlLower);
    const isImage = msg.type === 'image' || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(content?.url || '');
    const isPdf = (msg.type === 'document' || content?.filename) && content?.filename?.toLowerCase().endsWith('.pdf');
    const isList = (content?.type === 'list' || content?.body?.type === 'list') && (content?.action || content?.body?.action);

    let messageContent = null;

    if (isAudio) {
      messageContent = <AudioMessage url={content.url || msg.url || ''} />;
    } else if (isImage) {
      messageContent = (
        <ImageMessage
          url={content.url}
          caption={content.caption}
          onClick={() => onImageClick?.(content.url)}
        />
      );
    } else if (isPdf) {
      messageContent = (
        <DocumentMessage
          filename={content.filename}
          url={content.url}
          caption={content.caption}
          onClick={() => onPdfClick?.(content.url)}
        />
      );
    } else if (isList) {
      const listData = content?.type === 'list' ? content : content.body;
      messageContent = <ListMessage listData={listData} />;
    } else if (typeof content === 'string') {
      messageContent = <TextMessage content={content} />;
    } else {
      messageContent = <UnknownMessage />;
    }

    return (
      <div className={rowClass}>
        <div className={bubbleClass}>
          <div className="message-content">
            {messageContent}
          </div>
          {renderTimeAndStatus()}
          
          {/* Botão de resposta opcional */}
          {onReply && (
            <button
              className="reply-btn"
              onClick={() => onReply(msg)}
              title="Responder mensagem"
            >
              ↵
            </button>
          )}
        </div>
      </div>
    );
  }