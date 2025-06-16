import React, { useState, useEffect, forwardRef } from 'react';
import { apiGet } from '../../services/apiClient';
import './QuickReplies.css';

// Componente busca e exibe respostas rápidas com filtro por texto digitado
const QuickReplies = forwardRef(({ onSelect }, ref) => {
  const [quickReplies, setQuickReplies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // carrega respostas rápidas do backend
    (async () => {
      try {
        const data = await apiGet('/quick_replies');
        setQuickReplies(data);
      } catch (e) {
        console.error('Erro ao carregar quick replies:', e);
      }
    })();
  }, []);

  const filteredReplies = quickReplies.filter(qr => {
    const term = searchTerm.toLowerCase();
    return (
      qr.title.toLowerCase().includes(term) ||
      qr.content.toLowerCase().includes(term)
    );
  });

  return (
    <div className="quick-replies-wrapper" ref={ref}>
      <input
        type="text"
        className="quick-replies-search"
        placeholder="Buscar resposta rápida..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <ul className="quick-replies-list">
        {filteredReplies.map((qr) => (
          <li key={qr.id} onClick={() => onSelect(qr)}>
            <strong>{qr.title}</strong>
            <p>{qr.content}</p>
          </li>
        ))}
        {filteredReplies.length === 0 && <li className="no-results">Nenhum resultado encontrado</li>}
      </ul>
    </div>
  );
});

export default QuickReplies;
