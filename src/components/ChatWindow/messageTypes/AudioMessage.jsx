
// src/components/ChatWindow/messageTypes/AudioMessage.jsx
import React from 'react';
import './AudioMessage.css';

export default function AudioMessage({ url }) {
  return (
    <div className="audio-container">
      <audio controls>
        <source src={url} type="audio/ogg" />
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
}
