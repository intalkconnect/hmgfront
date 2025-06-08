// src/components/ChatWindow/MessageRow.jsx
import React, { useState, useRef, useEffect } from 'react';
import TextMessage from './messageTypes/TextMessage';
import ImageMessage from './messageTypes/ImageMessage';
import DocumentMessage from './messageTypes/DocumentMessage';
import ListMessage from './messageTypes/ListMessage';
import AudioMessage from './messageTypes/AudioMessage';
import UnknownMessage from './messageTypes/UnknownMessage';
import { renderReplyContent } from '../../utils/renderUtils';

import './MessageRow.css';
import { CheckCheck, Check, Download, Copy, CornerDownLeft, ChevronDown } from 'lucide-react';

export default function MessageRow({ msg, onImageClick, onPdfClick, onReply }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  let content = msg.content;

  // Tratamento seguro do conteúdo
  if (typeof content === 'string') {
    // Se for string numérica (qualquer comprimento), mantém como string
    if (/^\d+$/.test(content)) {
      // Não faz parse, mantém como texto puro
    } 
    // Só tenta parsear JSON se a string parece ser JSON
    else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        content = JSON.parse(content);
      } catch {
        // Mantém como string se o parse falhar
      }
    }
  }

  const isOutgoing = msg.direction === 'outgoing';
  const replyDirection = msg.reply_direction || '';
  const rowClass = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
  const bubbleClass = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  // ... (restante do código de renderTimeAndStatus permanece igual)

  const urlLower = String(content?.url || '').toLowerCase();
  const isAudio = msg.type === 'audio' || content?.voice || /\.(ogg|mp3|wav)$/i.test(urlLower);
  const isImage = msg.type === 'image' || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(content?.url || '');
  const isPdf = (msg.type === 'document' || content?.filename) && content?.filename?.toLowerCase().endsWith('.pdf');
  const isList = (content?.type === 'list' || content?.body?.type === 'list') && (content?.action || content?.body?.action);

  let messageContent = null;

  // Tratamento do conteúdo para renderização
  if (typeof content === 'string' && /^\d+$/.test(content)) {
    // Strings numéricas longas são tratadas como texto puro
    messageContent = <TextMessage content={content} />;
  } else if (typeof content === 'number' || typeof content === 'boolean') {
    messageContent = <TextMessage content={String(content)} />;
  } else if (isAudio) {
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
  } else if (typeof content === 'object' && (content?.text || content?.caption)) {
    messageContent = <TextMessage content={content.text || content.caption} />;
  } else {
    messageContent = <UnknownMessage />;
  }


  const handleCopy = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
    }
    setMenuOpen(false);
  };

const handleDownload = async () => {
  const fileUrl = content?.url;
  const filename = content?.filename || 'arquivo';

  if (!fileUrl) return;

  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);

    setMenuOpen(false);
  } catch (err) {
    console.error('Erro ao baixar arquivo:', err);
  }
};


  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={rowClass}>
      <div className={bubbleClass}>
        <div className="message-bubble-content">
          {/* Ícone de seta no canto superior direito */}
          {/* Ícone de seta no canto superior direito */}
<div className="menu-arrow" ref={menuRef}>
  <button onClick={toggleMenu} className="menu-button" title="Mais opções">
    <ChevronDown size={16} />
  </button>
  {menuOpen && (
    <div className={`menu-dropdown ${isOutgoing ? 'right' : 'left'}`}>

      {onReply && (
        <button onClick={() => { onReply(msg); setMenuOpen(false); }}>
          <CornerDownLeft size={14} /> Responder
        </button>
      )}
      {typeof content === 'string' && (
        <button onClick={handleCopy}>
          <Copy size={14} /> Copiar
        </button>
      )}
      {(isImage || isPdf) && (
        <button onClick={handleDownload}>
          <Download size={14} /> Baixar
        </button>
      )}
    </div>
  )}
</div>
{msg.replyTo && (
  <div className="replied-message">
    <div className="replied-content">
      {(msg.reply_direction === 'outgoing') && <strong>Você</strong>}
      <div className="replied-text">
        {renderReplyContent(msg.replyTo)}
      </div>
    </div>
  </div>
)}
           <div className="message-content">
            {messageContent}
           </div>

           {renderTimeAndStatus()}
           </div>
            </div>
           </div>
  );
}
