// src/components/ChatWindow/messageTypes/AudioMessage.jsx
import React from 'react';
import './AudioMessage.css'; // importa as regras que acabamos de definir

export default function AudioMessage({ url }) {
  return (
    <div className="audio-container" controlsList="nodownload">
       <audio controls src={url}>
        
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
}
