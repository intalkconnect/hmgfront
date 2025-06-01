import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function DetailsPanel({ userIdSelecionado }) {
  const [userInfo, setUserInfo] = useState(null)

  // Se você tiver uma tabela "users" no Supabase, busque info extra
  useEffect(() => {
    if (!userIdSelecionado) return
    async function fetchInfo() {
      // Exemplo: se existir tabela "users" com coluna "id"
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userIdSelecionado)
        .single()

      if (!error) {
        setUserInfo(data)
      } else {
        setUserInfo(null)
      }
    }
    fetchInfo()
  }, [userIdSelecionado])

  if (!userIdSelecionado) {
    return <div style={{ fontSize: '1rem', color: '#555' }}>Selecione um usuário</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tags de status */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <span className="tag">Qualificado</span>
        <span className="tag">Site Cliente</span>
        <span className="tag">Evento Conf</span>
      </div>

      {/* Cartão de “Negócio Selecionado” */}
      <div>
        <h3 style={{ marginBottom: '8px' }}>Negócio Selecionado</h3>
        <div className="negocio-card">
          <p style={{ margin: 0 }}>
            <strong>Comercial → Eventos</strong>
          </p>
          <p style={{ margin: '4px 0 0 0' }}>R$ 0,00</p>
          <div style={{ marginTop: '8px' }}>
            <button>Ganho</button>
            <button>Perdido</button>
            <button>Aberto</button>
          </div>
        </div>
      </div>

      {/* Seções colapsáveis (aqui apenas títulos e espaço vazio) */}
      <div>
        <h4>Negócio</h4>
        {/* Você pode colocar um formulário ou lista de campos aqui */}
      </div>

      <div>
        <h4>Notas</h4>
        <textarea
          style={{
            width: '100%',
            height: '80px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'vertical',
            fontSize: '0.9rem'
          }}
          placeholder="Adicione notas sobre este cliente..."
        />
      </div>

      <div>
        <h4>Histórico</h4>
        {/* Se tiver uma tabela de logs, pode iterar aqui */}
      </div>

      {/* Exibir userInfo (opcional) */}
      {userInfo && (
        <div>
          <h4>Dados do Usuário</h4>
          <pre
            style={{
              background: '#f8f8f8',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              overflowX: 'auto'
            }}
          >
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
