import { create } from 'zustand';
import { apiGet, apiPut } from '../services/apiClient';

const useConversationsStore = create((set) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {},
  clienteAtivo: null, // ⬅️ Novo: dados de cliente + ticket

  setClienteAtivo: (info) => set({ clienteAtivo: info }),

  // Define a conversa para um usuário específico
  setConversation: (userId, data) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [userId]: {
          ...(state.conversations[userId] || {}),
          ...data,
        },
      },
    })),

  // Busca o nome do contato pelo user_id
  getContactName: (userId) => {
    return get().conversations[userId]?.name || userId;
  },

  // Atualiza o último horário de leitura e zera as não lidas
  setLastRead: async (userId, timestamp) => {
    try {
      await apiPut(`/messages/read-status/${userId}`, { last_read: timestamp });

      set((state) => ({
        lastRead: {
          ...state.lastRead,
          [userId]: timestamp,
        },
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0,
        },
      }));
    } catch (err) {
      console.error('Erro ao atualizar lastRead:', err);
    }
  },

  // Incrementa a contagem de não lidas
  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    })),

  // Carrega as contagens de mensagens não lidas do banco de dados
  loadUnreadCounts: async () => {
    try {
      const data = await apiGet('/messages/unread-counts');
      const counts = data.reduce((acc, item) => {
        acc[item.user_id] = item.unread_count;
        return acc;
      }, {});
      set({ unreadCounts: counts });
    } catch (error) {
      console.error('Erro ao carregar unreadCounts:', error);
    }
  },

  // Carrega os últimos horários de leitura
  loadLastReadTimes: async () => {
    try {
      const data = await apiGet('/messages/read-status');
      const lastRead = data.reduce((acc, item) => {
        acc[item.user_id] = item.last_read;
        return acc;
      }, {});
      set({ lastRead });
    } catch (error) {
      console.error('Erro ao carregar lastReadTimes:', error);
    }
  },
}));


export default useConversationsStore;
