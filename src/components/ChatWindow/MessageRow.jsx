
// src/components/ChatWindow/MessageRow.jsx
import React from 'react';
import TextMessage from './messageTypes/TextMessage';
import AudioMessage from './messageTypes/AudioMessage';
import ImageMessage from './messageTypes/ImageMessage';
import DocumentMessage from './messageTypes/DocumentMessage';
import ListMessage from './messageTypes/ListMessage';
import UnknownMessage from './messageTypes/UnknownMessage';
import './MessageRow.css';

export default function MessageRow({ msg, onImageClick, onPdfClick }) {
  const isOutgoing = msg.direction === 'outgoing';

  let content = msg.content;
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch {
      // se não for JSON, continua como string
    }
  }

  const renderInner = () => {
    // 1) Áudio
    if (
      msg.type === 'audio' ||
      content?.voice ||
      content?.url?.toLowerCase().endsWith('.ogg')
    ) {
      return <AudioMessage url={content.url} />;
    }

    // 2) Imagem
    if (
      msg.type === 'image' ||
      (content?.url && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(content.url))
    ) {
      return (
        <ImageMessage
          url={content.url}
          caption={content.caption}
          onClick={() => onImageClick(content.url)}
        />
      );
    }

    // 3) Documento PDF
    if (
      (msg.type === 'document' || content?.filename) &&
      content.filename?.toLowerCase().endsWith('.pdf')
    ) {
      return (
        <DocumentMessage
          filename={content.filename}
          url={content.url}
          caption={content.caption}
          onClick={() => onPdfClick(content.url)}
        />
      );
    }

    // 4) Lista WhatsApp-like
    const listData =
      content?.type === 'list'
        ? content
        : content?.body?.type === 'list'
        ? content.body
        : null;
    if (listData?.type === 'list' && listData?.action?.sections?.length) {
      return <ListMessage listData={listData} />;
    }

    // 5) Texto simples
    if (typeof content === 'string') {
      return <TextMessage content={content} />;
    }

    // 6) Fallback
    return <UnknownMessage />;
  };

  return (
    <div className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
      <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
        {renderInner()}
        <span className="message-time">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isOutgoing ? (
            msg.status === 'delivered' ? (
              <span className="check delivered">✔✔</span>
            ) : msg.status === 'sent' ? (
              <span className="check sent">✔✔</span>
            ) : (
              <span className="check pending">✔</span>
            )
          ) : (
            <span className="check delivered">✔✔</span>
          )}
        </span>
      </div>
    </div>
  );
}
