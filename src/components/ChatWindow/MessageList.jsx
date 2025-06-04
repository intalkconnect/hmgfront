
// src/components/ChatWindow/MessageList.jsx
import React from 'react';
import MessageRow from './MessageRow';

export default function MessageList({ messages, onImageClick, onPdfClick }) {
  return (
    <>
      {messages.map((msg) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          onImageClick={onImageClick}
          onPdfClick={onPdfClick}
        />
      ))}
    </>
  );
}
