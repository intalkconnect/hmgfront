// src/store/useConversationsStore.js
import { create } from 'zustand'
import { supabase } from '../services/supabaseClient'

const useConversationsStore = create((set, get) => ({
  conversations: {},
  userIdSelecionado: null,
  unreadCounts: {},

  // Define o usuário selecionado
  setUserIdSelecionado: (userId) => set({ userIdSelecionado: userId }),

  // Atualiza uma conversa
  setConversation: (userId, data) => set(state => ({
    conversations: {
      ...state.conversations,
      [userId]: { ...(state.conversations[userId] || {}), ...data }
    }
  })),

  // Busca contagem de não lidas
  fetchInitialUnread: async (userId) => {
    const { data } = await supabase.rpc('get_unread_count', { user_id: userId })
    set(state => ({
      unreadCounts: { ...state.unreadCounts, [userId]: data || 0 }
    }))
  },

  // Incrementa não lidas
  incrementUnread: (userId) => set(state => ({
    unreadCounts: { ...state.unreadCounts, [userId]: (state.unreadCounts[userId] || 0) + 1 }
  })),

  // Marca como lido
  markAsRead: async (userId) => {
    await supabase.from('user_unread_messages')
      .upsert({ user_id: userId, unread_count: 0 })
    set(state => ({
      unreadCounts: { ...state.unreadCounts, [userId]: 0 }
    }))
  }
}))

export default useConversationsStore
