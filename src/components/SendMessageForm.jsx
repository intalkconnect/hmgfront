import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SendMessageForm({ userIdSelecionado }) {
  const [text, setText] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    // Constrói o objeto da nova mensagem
    const novaMensagem = {
      user_id: userIdSelecionado,
      whatsapp_message_id: crypto.randomUUID(), // ou use qualquer gerador UUID
      direction: 'outgoing',
      type: 'text',
      content: text.trim(),
      // flow_id, agent_id, queue_id, metadata, status (default: pending) podem ir aqui
    }

    // Insere no Supabase
    const { error } = await supabase.from('messages').insert(novaMensagem)
    if (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
    setText('')
    // A mensagem vai aparecer via Realtime (INSERT), mas se quiser refletir instantâneo, poderia adicionar manualmente ao array de mensagens do ChatWindow
  }

  return (
    <form onSubmit={handleSend} style={{ display: 'flex', width: '100%' }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Responda aqui"
      />
      <button type="submit">
        {/* Ícone de enviar (aviãozinho) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="#fff"
          viewBox="0 0 24 24"
        >
          <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z" />
        </svg>
      </button>
    </form>
  )
}
