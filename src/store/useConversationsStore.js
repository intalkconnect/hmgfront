import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

const useConversationsStore = create((set, get) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {},

  // Atualiza uma conversa específica
  setConversation: (userId, data) => {
    if (!userId) return;
    set((state) => ({
      conversations: {
        ...state.conversations,
        [userId]: { 
          ...(state.conversations[userId] || {}), 
          ...data 
        }
      }
    }));
  },

  // Busca contagem inicial de não lidas do banco
  fetchInitialUnread: async (userId) => {
    try {
      const { data } = await supabase
        .from('user_unread_messages')
        .select('unread_count')
        .eq('user_id', userId)
        .single();
      
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: data?.unread_count || 0
        }
      }));
    } catch (error) {
      console.error("Erro ao buscar não lidas:", error);
    }
  },

  // Marca como lido
  markAsRead: async (userId) => {
    try {
      await supabase
        .from('user_unread_messages')
        .upsert({ 
          user_id: userId, 
          unread_count: 0,
          last_checked: new Date().toISOString() 
        });
      
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0
        },
        lastRead: {
          ...state.lastRead,
          [userId]: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  },

  // Incrementa não lidas
  incrementUnread: (userId) => {
    if (!userId) return;
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1
      }
    }));
  },

  // Remove conversa
  removeConversation: (userId) => {
    set(state => {
      const newConvs = { ...state.conversations };
      const newCounts = { ...state.unreadCounts };
      delete newConvs[userId];
      delete newCounts[userId];
      return { 
        conversations: newConvs, 
        unreadCounts: newCounts 
      };
    });
  }
}));

export default useConversationsStore;
