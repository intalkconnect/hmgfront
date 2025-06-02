// src/components/DetailsPanel.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function DetailsPanel({ userIdSelecionado }) {
  const [userInfo, setUserInfo] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [userError, setUserError] = useState(null)

  useEffect(() => {
    // Se não há userId selecionado, reseta tudo
    if (!userIdSelecionado) {
      setUserInfo(null)
      setUserError(null)
      setLoadingUser(false)
      return
    }

    let isMounted = true
    setLoadingUser(true)
    setUserError(null)

    // Tenta buscar em “users” via REST; se retornar 404, trata como “não encontrado”
    supabase
      .from('users')
      .select('*')
      .eq('id', userIdSelecionado)
      .single()
      .then(({ data, error, status }) => {
        if (!isMounted) return
        // Se status == 406 ou >= 400, é possível que a tabela “users” não exista
        if (status === 406 || (status >= 400 && !data)) {
          // Tabela “users” não existe ou retorno de erro 404
          setUserInfo(null)
          setUserError('Usuário não encontrado')
        } else if (error) {
          // Algum outro erro (rejeição de RLS, etc.)
          console.error('Erro ao buscar usuário:', error)
          setUserInfo(null)
          setUserError(error.message)
        } else {
          setUserInfo(data)
          setUserError(null)
        }
        setLoadingUser(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Falha inesperada ao buscar usuário:', err)
        setUserInfo(null)
        setUserError('Erro inesperado')
        setLoadingUser(false)
      })

    return () => {
      isMounted = false
    }
  }, [userIdSelecionado])

  if (!userIdSelecionado) {
    return (
      <div style={{ fontSize: '1rem', color: '#555' }}>
        Selecione um usuário
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Status Tags (fixo/estático) */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <span className="tag">Qualificado</span>
        <span className="tag">Site Cliente</span>
        <span className="tag">Evento Conf</span>
      </div>

      {/* Negócio Selecionado (exemplo estático) */}
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

      {/* Seção “Negócio” (colapsável, mas vazia) */}
      <div>
        <h4>Negócio</h4>
      </div>

      {/* Seção “Notas” */}
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

      {/* Seção “Histórico” (vazia) */}
      <div>
        <h4>Histórico</h4>
      </div>

      {/* Seção de informações do usuário: mostra loading, erro ou detalhes */}
      {loadingUser && <p>Carregando dados do usuário...</p>}

      {!loadingUser && userError && (
        <p style={{ color: 'red' }}>{userError}</p>
      )}

      {!loadingUser && !userError && userInfo && (
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