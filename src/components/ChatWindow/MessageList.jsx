import React, { useState, useRef, forwardRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import './MessageList.css';

export default function MessageList({ messages }) {
  const [visibleCount, setVisibleCount] = useState(100);
  const listRef = useRef(null);
  
  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 100, messages.length));
  };

  const Row = ({ index, style }) => {
    const message = messages[messages.length - visibleCount + index];
    return (
      <div style={style} className="message-item">
        {message?.content || ''}
      </div>
    );
  };

  return (
    <div className="message-list-container">
      {messages.length > visibleCount && (
        <button 
          className="load-more-button"
          onClick={loadMore}
        >
          Carregar mais 100 mensagens
        </button>
      )}

      <List
        ref={listRef}
        height={600}
        itemCount={visibleCount}
        itemSize={() => 60} // Altura estimada por item
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
}
