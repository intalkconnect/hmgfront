import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import './Sidebar.css'
import { File, Mic, Image } from 'lucide-react';

export default function Sidebar({ conversations, onSelectUser, userIdSelecionado  }) {
  const [clientesMap, setClientesMap] = useState({})
  const [distribuicaoTickets, setDistribuicaoTickets] = useState('manual');
  const [filaCount, setFilaCount] = useState(0);
  const [unreadMap, setUnreadMap] = useState({});

  useEffect(() => {
    const map = {}
    conversations.forEach((conv) => {
      const fullId = conv.user_id.includes('@')
        ? conv.user_id
        : `${conv.user_id}@w.msgcli.net`
      map[fullId] = {
        name: conv.name || fullId,
        channel: conv.channel,
        ticket: conv.ticket_number,
        queueName: conv.fila
      }
    })
    setClientesMap(map)
  }, [conversations])

  useEffect(() => {
    const fetchSettingsAndFila = async () => {
      const { data: settings } = await supabase
        .from('settings')
        .select('distribuicao_tickets')
        .single();

      if (settings?.distribuicao_tickets) {
        setDistribuicaoTickets(settings.distribuicao_tickets);
      }

      const filaAtivos = conversations.filter(conv => !conv.atendido);
      setFilaCount(filaAtivos.length);
    };

    fetchSettingsAndFila();
  }, [conversations]);

  useEffect(() => {
    const channel = supabase
      .channel('mensagens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;

        if (msg.direction === 'incoming' && msg.user_id !== userIdSelecionado) {
          setUnreadMap((prev) => ({
            ...prev,
            [msg.user_id]: (prev[msg.user_id] || 0) + 1,
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userIdSelecionado]);

  const handleSelectUser = (id) => {
    onSelectUser(id);
    setUnreadMap(prev => ({ ...prev, [id]: 0 }));
  };

  const getSnippet = (rawContent) => {
    try {
      const parsed = JSON.parse(rawContent)

      if (parsed.url) {
        const url = parsed.url.toLowerCase()
        if (url.endsWith('.ogg') || url.endsWith('.mp3') || url.endsWith('.wav')) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mic  size={18} />Áudio</span>
        }
        if (url.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/i)) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Imagem</span>
        }
        if (url.endsWith('.pdf')) {
          return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Arquivo</span>
        }
        return <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={18} />Arquivo</span>
      }

      if (parsed.type === 'list' || parsed.body?.type === 'list') {
        return '🔘 Lista'
      }

      if (parsed.text) {
        return parsed.text.length > 40 ? parsed.text.slice(0, 37) + '...' : parsed.text
      }

      if (parsed.caption) {
        return parsed.caption.length > 40 ? parsed.caption.slice(0, 37) + '...' : parsed.caption
      }

      return '[mensagem]'
    } catch (e) {
      const plain = rawContent || ''
      return plain.length > 40 ? plain.slice(0, 37) + '...' : plain
    }
  }

  return (
    <div className="sidebar-container">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="sidebar-input"
        />
      </div>

      <div className="fila-info">
        {distribuicaoTickets !== 'manual' ? (
          <>
            <span className="fila-count">
              {filaCount > 0
                ? `${filaCount} cliente${filaCount > 1 ? 's' : ''} aguardando`
                : 'Não há clientes aguardando'}
            </span>
            <button
              className="botao-proximo"
              onClick={() => console.log('Puxar próximo cliente')}
              disabled={filaCount === 0}
            >
              Próximo
            </button>
          </>
        ) : null}
      </div>

      <ul className="chat-list">
        {conversations.map((conv) => {
          const fullId = conv.user_id.includes('@')
            ? conv.user_id
            : `${conv.user_id}@w.msgcli.net`

          const cliente = clientesMap[fullId] || {}
          const nomeCliente = cliente.name || conv.user_id
          const isWhatsapp = (cliente.channel) === 'whatsapp'
          const queueName = cliente.queueName
          const ticket = cliente.ticket

          const snippet = getSnippet(conv.content)
          const normalizedSelected = userIdSelecionado && userIdSelecionado.includes('@')
            ? userIdSelecionado
            : `${userIdSelecionado}@w.msgcli.net`

          return (
            <li
              key={conv.user_id}
              className={`chat-list-item ${normalizedSelected === fullId ? 'active' : ''}`}
              onClick={() => handleSelectUser(fullId)}
            >
              <div className="chat-avatar">
                {isWhatsapp && (
                  <img
                    src="/icons/whatsapp.png"
                    alt="whatsapp"
                    className="avatar-img"
                  />
                )}
              </div>

              <div className="chat-details">
                <div className="chat-title">{nomeCliente}</div>
                <div className="chat-snippet">{snippet}</div>
                <div className="chat-meta">
                  <br />
                  <span className="chat-ticket">
                    #{ticket || '000000'}
                  </span>
                  <span className="chat-queue">
                    Fila:{queueName || 'Orçamento'}
                  </span>
                </div>
              </div>

              {unreadMap[fullId] > 0 && fullId !== normalizedSelected && (
                <div className="unread-dot" title={`${unreadMap[fullId]} nova(s)`}></div>
              )}

              <div className="chat-time">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
