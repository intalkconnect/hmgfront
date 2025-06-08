import { create } from 'zustand';

const useConversationsStore = create((set, get) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {},

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
      const res = await fetch('/last-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, last_read: timestamp }),
      });

      if (res.ok) {
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
      } else {
        console.error('Erro ao atualizar last_read:', await res.text());
      }
    } catch (err) {
      console.error('Erro na requisição de last_read:', err);
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

  // Carrega as contagens de mensagens não lidas do backend
  loadUnreadCounts: async () => {
    try {
      const res = await fetch('/unread-counts');
      if (!res.ok) throw new Error('Erro ao buscar contagem de não lidas');
      const data = await res.json();

      const counts = data.reduce((acc, item) => {
        acc[item.user_id] = item.unread_count;
        return acc;
      }, {});

      set({ unreadCounts: counts });
    } catch (err) {
      console.error('Erro ao carregar unreadCounts:', err);
    }
  },

  // Carrega os últimos horários de leitura do backend
  loadLastReadTimes: async () => {
    try {
      const res = await fetch('/last-read');
      if (!res.ok) throw new Error('Erro ao buscar lastRead');
      const data = await res.json();

      const lastRead = data.reduce((acc, item) => {
        acc[item.user_id] = item.last_read;
        return acc;
      }, {});

      set({ lastRead });
    } catch (err) {
      console.error('Erro ao carregar lastRead:', err);
    }
  },
}));

export default useConversationsStore;
