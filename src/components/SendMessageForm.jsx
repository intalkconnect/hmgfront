import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SendMessageForm({ userIdSelecionado }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)

    try {
      const to = userIdSelecionado.replace('@w.msgcli.net', '')

      await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          type: 'text',
          content: input
        })
      })

      setInput('')
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err)
    } finally {
      setLoading(false)
    }
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
