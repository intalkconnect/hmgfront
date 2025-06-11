import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import './TransferModal.css';
import useConversationsStore from '../../../store/useConversationsStore';

export default function TransferModal({ userId, onClose }) {
  const { userEmail, mergeConversation, setSelectedUserId } = useConversationsStore();

  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [atendentes, setAtendentes] = useState([]);

  // Carrega filas com permissão
  useEffect(() => {
    const carregarFilas = async () => {
      try {
        const data = await apiGet(`/filas/fila-permissoes/${userEmail}`);
        setFilas(data);
      } catch (err) {
        console.error('Erro ao buscar filas:', err);
        alert('Erro ao carregar filas disponíveis.');
        onClose();
      }
    };

    carregarFilas();
  }, [userEmail, onClose]);

  // Carrega atendentes da fila selecionada
  useEffect(() => {
    const carregarAtendentes = async () => {
      if (!filaSelecionada) {
        setAtendentes([]);
        return;
      }

      try {
        const filaNome = filas.find(f => f.id.toString() === filaSelecionada)?.nome;
        if (!filaNome) {
          setAtendentes([]);
          return;
        }

        const response = await apiGet(`/filas/atendentes/${filaNome}`);
        const atendentesData = Array.isArray(response.atendentes) ? response.atendentes : response;
        setAtendentes(atendentesData);
      } catch (err) {
        console.error('Erro ao buscar atendentes:', err);
        setAtendentes([]);
      }
    };

    carregarAtendentes();
  }, [filaSelecionada, filas]);

  const confirmarTransferencia = async () => {
    if (!filaSelecionada) {
      alert('Selecione uma fila para transferir.');
      return;
    }

    const filaNome = filas.find(f => f.id.toString() === filaSelecionada)?.nome;
    if (!filaNome) {
      alert('Fila inválida selecionada.');
      return;
    }

    try {
      const body = {
        from_user_id: userId,
        to_fila: filaNome, // nome da fila, não o ID
        to_assigned_to: responsavel || null,
        transferido_por: userEmail
      };

      await apiPost('/tickets/transferir', body);

      mergeConversation(userId, { status: 'closed' });
      setSelectedUserId(null);
      onClose();
    } catch (err) {
      console.error('Erro ao transferir:', err);
      alert('Erro ao transferir atendimento.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Transferir Atendimento</h2>

        <label>
          Fila:
          <select
            value={filaSelecionada}
            onChange={(e) => {
              setFilaSelecionada(e.target.value);
              setResponsavel('');
            }}
          >
            <option value="">Selecione uma fila</option>
            {filas.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </label>

        <label>
          Atribuir para (opcional):
          {atendentes.length === 0 ? (
            <div className="info-text">Nenhum atendente disponível nesta fila.</div>
          ) : (
            <select
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            >
              <option value="">-- Qualquer atendente --</option>
              {atendentes.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.name} {a.lastname} ({a.email})
                </option>
              ))}
            </select>
          )}
        </label>

        <div className="modal-actions">
          <button onClick={confirmarTransferencia}>Transferir</button>
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
