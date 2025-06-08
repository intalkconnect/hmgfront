import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

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

  // Atualiza o último horário de leitura e zera as não lidas
  setLastRead: async (userId, timestamp) => {
    // Atualiza no banco de dados
    const { error } = await supabase
      .from('user_last_read')
      .upsert({
        user_id: userId,
        last_read: timestamp,
      });

    if (!error) {
      // Atualiza no estado local
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
    const { data, error } = await supabase.rpc('contar_mensagens_nao_lidas');
    if (!error && data) {
      const counts = data.reduce((acc, item) => {
        acc[item.user_id] = item.unread_count;
        return acc;
      }, {});
      set({ unreadCounts: counts });
    }
  },

  // Carrega os últimos horários de leitura
  loadLastReadTimes: async () => {
    const { data, error } = await supabase.from('user_last_read').select('*');
    if (!error && data) {
      const lastRead = data.reduce((acc, item) => {
        acc[item.user_id] = item.last_read;
        return acc;
      }, {});
      set({ lastRead });
    }
  },
}));

export default useConversationsStore;
