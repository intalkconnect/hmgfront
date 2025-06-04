
// src/components/ChatWindow/messageTypes/ImageMessage.jsx
import React from 'react';
import './ImageMessage.css';

export default function ImageMessage({ url, caption, onClick }) {
  return (
    <div className="image-container" onClick={onClick}>
      <img src={url} alt={caption || 'Imagem'} />
    </div>
  );
}
