import React, { useState, useEffect, forwardRef } from 'react';
import { apiGet } from '../../services/apiClient';
import './QuickReplies.css';

// Componente responsável por exibir respostas rápidas
const QuickReplies = forwardRef(({ onSelect }, ref) => {
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickReplies = async () => {
      try {
        const data = await apiGet('/quick_replies');
        setQuickReplies(data);
      } catch (err) {
        console.error('Erro ao carregar respostas rápidas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuickReplies();
  }, []);

  if (loading) return null;
  if (quickReplies.length === 0) return null;

  return (
    <div ref={ref} className="quick-replies-dropdown">
      <ul className="quick-replies-list">
        {quickReplies.map(({ id, title, content }) => (
          <li key={id} onClick={() => onSelect({ title, content })}>
            <strong>{title}</strong>
            <div className="quick-reply-preview">{content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default QuickReplies;
