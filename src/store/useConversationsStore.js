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

  // Atualiza conversa selecionada, zera não lidas do atual e do anterior
setSelectedUserId: (userId) => {
  const previousId = get().selectedUserId;

  set({ selectedUserId: userId });

  if (previousId && previousId !== userId) {
    get().resetUnread(previousId);
    get().clearNotified(previousId); // limpa notificação anterior
  }

  get().resetUnread(userId);
  get().clearNotified(userId);

  apiPut(`/messages/read-status/${userId}`, {
    last_read: new Date().toISOString(),
  }).catch((err) => console.error('Erro ao marcar como lido:', err));
},


  // Zera contagem de não lidas
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

  // Incrementa contagem de não lidas
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

  // Retorna nome do contato ou ID
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

  // Carrega timestamps de leitura do servidor
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

  // Filtra conversas ativas e atribuídas
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

  notifiedConversations: {},

markNotified: (userId) =>
  set((state) => ({
    notifiedConversations: {
      ...state.notifiedConversations,
      [userId]: true,
    },
  })),

clearNotified: (userId) =>
  set((state) => {
    const updated = { ...state.notifiedConversations };
    delete updated[userId];
    return { notifiedConversations: updated };
  }),

}));

export default useConversationsStore;
