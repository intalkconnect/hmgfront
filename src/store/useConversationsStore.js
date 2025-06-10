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

  setUserInfo: ({ email, filas }) => set({ userEmail: email, userFilas: filas }),

  setSelectedUserId: (userId) => {
    set({ selectedUserId: userId });

    // Zera contagem de não lidas e atualiza read status local e remoto
    get().resetUnread(userId);
    apiPut(`/messages/read-status/${userId}`, {
      last_read: new Date().toISOString(),
    }).catch((err) => console.error('Erro ao marcar como lido:', err));
  },

  // Renomeado para resetUnread para consistência com App.jsx
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

  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    })),

  setClienteAtivo: (info) => set({ clienteAtivo: info }),

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

  getContactName: (userId) => {
    return get().conversations[userId]?.name || userId;
  },

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

  getFilteredConversations: () => {
    const { conversations, userEmail, userFilas } = get();
    return Object.fromEntries(
      Object.entries(conversations).filter(([_, conv]) => {
        return (
          conv.status === 'open' &&
          conv.assigned_to === userEmail &&
          userFilas.includes(conv.fila)
        );
      })
    );
  },
}));

export default useConversationsStore;
