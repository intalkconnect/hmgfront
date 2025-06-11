import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../services/apiClient';
import './TransferModal.css';
import useConversationsStore from '../../store/useConversationsStore';

export default function TransferModal({ userId, onClose }) {
  const { userEmail, mergeConversation, setSelectedUserId } = useConversationsStore();

  const [filas, setFilas] = useState([]);
  const [filaSelecionada, setFilaSelecionada] = useState('');
  const [responsavel, setResponsavel] = useState('');

  useEffect(() => {
    const carregarFilas = async () => {
      try {
        const data = await apiGet(`/fila-permissoes/${userEmail}`);
        setFilas(data);
      } catch (err) {
        console.error('Erro ao buscar filas:', err);
        alert('Erro ao carregar filas disponíveis.');
        onClose();
      }
    };

    carregarFilas();
  }, [userEmail, onClose]);

  const confirmarTransferencia = async () => {
    if (!filaSelecionada) {
      alert('Selecione uma fila para transferir.');
      return;
    }

    try {
      const body = {
        from_user_id: userId,
        to_fila: filaSelecionada,
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
          <select value={filaSelecionada} onChange={(e) => setFilaSelecionada(e.target.value)}>
            <option value="">Selecione uma fila</option>
            {filas.map((f) => (
              <option key={f.id} value={f.nome}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Atribuir para (email - opcional):
          <input
            type="email"
            placeholder="exemplo@dominio"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button onClick={confirmarTransferencia}>Transferir</button>
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
