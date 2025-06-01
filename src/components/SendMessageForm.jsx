import React, { useState } from 'react'

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
    <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '8px' }}>
      <input
        type="text"
        placeholder="Responda aqui"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
      />
      <button type="submit" disabled={loading || !input.trim()}>
        {loading ? '...' : 'Enviar'}
      </button>
    </form>
  )
}
