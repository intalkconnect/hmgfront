import { create } from 'zustand';
import { apiGet, apiPut } from '../services/apiClient';

const useConversationsStore = create((set, get) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {},
  clienteAtivo: null,
  selectedUserId: null,
  userEmail: null,
  userFilas: [],

  // Configura email e filas do usuário
  setUserInfo: ({ email, filas }) => set({ userEmail: email, userFilas: filas }),

  // Atualiza conversa selecionada, zera não lidas e marca como lido no backend
  setSelectedUserId: (userId) => {
    set({ selectedUserId: userId });
    get().resetUnread(userId);
    apiPut(`/messages/read-status/${userId}`, {
      last_read: new Date().toISOString(),
    }).catch((err) => console.error('Erro ao marcar como lido:', err));
  },

  // Zera contagem de não lidas e registra timestamp de leitura
  resetUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
      lastRead: {
        ...state.lastRead,
        [userId]: new Date().toISOString(),
      },
    })),

  // Incrementa não lidas
  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    })),

  setClienteAtivo: (info) => set({ clienteAtivo: info }),

  // Adiciona ou atualiza dados de conversa
  mergeConversation: (userId, data) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [userId]: {
          ...(state.conversations[userId] || {}),
          ...data,
        },
      },
    })),

  // Retorna nome de contato ou ID
  getContactName: (userId) => get().conversations[userId]?.name || userId,

  // Carrega contagem de não lidas do servidor
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

  // Carrega timestamps de última leitura do servidor
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

  // Filtra conversas abertas e atribuídas ao usuário
  getFilteredConversations: () => {
    const { conversations, userEmail, userFilas } = get();
    return Object.fromEntries(
      Object.entries(conversations).filter(([_, conv]) =>
        conv.status === 'open' &&
        conv.assigned_to === userEmail &&
        userFilas.includes(conv.fila)
      )
    );
  },
}));

export default useConversationsStore;
