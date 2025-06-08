import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

const useConversationsStore = create((set, get) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {},

  setConversation: (userId, data) => {
    if (!userId) return;
    set(state => ({
      conversations: {
        ...state.conversations,
        [userId]: { 
          ...(state.conversations[userId] || {}), 
          ...data 
        }
      }
    }));
  },

  fetchInitialUnread: async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_unread_count', {
        user_id: userId
      });

      if (!error && data !== null) {
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [userId]: data
          }
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar não lidas:", error);
    }
  },

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

  incrementUnread: (userId) => {
    if (!userId) return;
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1
      }
    }));
  },

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
