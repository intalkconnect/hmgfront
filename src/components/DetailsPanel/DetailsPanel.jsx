// src/components/DetailsPanel.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import './DetailsPanel.css'  // importe o CSS aqui

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

    supabase
      .from('users')
      .select('*')
      .eq('id', userIdSelecionado)
      .single()
      .then(({ data, error, status }) => {
        if (!isMounted) return
        if (status === 406 || (status >= 400 && !data)) {
          setUserInfo(null)
          setUserError('Usuário não encontrado')
        } else if (error) {
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
      <div className="details-panel-container">
        <p className="loading">Selecione um usuário</p>
      </div>
    )
  }

  return (
    <div className="details-panel-container">
      {/* === Status Tags (fixo/estático) === */}
      <div className="details-tags">
        <span className="tag">Qualificado</span>
        <span className="tag">Site Cliente</span>
        <span className="tag">Evento Conf</span>
      </div>

      {/* === Negócio Selecionado (exemplo estático) === */}
      <div className="negocio-section">
        <h3>Negócio Selecionado</h3>
        <div className="negocio-card">
          <p><strong>Comercial → Eventos</strong></p>
          <p>R$ 0,00</p>
          <div className="negocio-buttons">
            <button className="btn">Ganho</button>
            <button className="btn">Perdido</button>
            <button className="btn">Aberto</button>
          </div>
        </div>
      </div>

      {/* === Seção “Negócio” (colapsável, mas vazia) === */}
      <div className="section">
        <h4>Negócio</h4>
        {/* Conteúdo, caso implemente depois */}
      </div>

      {/* === Seção “Notas” === */}
      <div className="section">
        <h4>Notas</h4>
        <textarea
          className="notes-textarea"
          placeholder="Adicione notas sobre este cliente..."
        />
      </div>

      {/* === Seção “Histórico” (vazia) === */}
      <div className="section">
        <h4>Histórico</h4>
        {/* Caso queira exibir itens de histórico, coloque aqui */}
      </div>

      {/* === Seção de informações do usuário: loading / erro / dados === */}
      {loadingUser && <p className="loading">Carregando dados do usuário...</p>}

      {!loadingUser && userError && (
        <p className="error">{userError}</p>
      )}

      {!loadingUser && !userError && userInfo && (
        <div className="user-info">
          <h4>Dados do Usuário</h4>
          <pre className="user-info-pre">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
