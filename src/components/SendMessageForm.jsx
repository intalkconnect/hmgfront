import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SendMessageForm({ userIdSelecionado }) {
  const [text, setText] = useState('')

  const handleSend = async (e) => {
  e.preventDefault()
  if (!text.trim()) return

  const payload = {
    to: userIdSelecionado.replace('@w.msgcli.net', ''),
    type: 'text',
    content: text.trim()
  }

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao enviar mensagem:', err)
    }
  } catch (err) {
    console.error('Erro de rede ao enviar mensagem:', err)
  }

  setText('')
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
