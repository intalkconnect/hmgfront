// src/store/useConversationsStore.js
import { create } from 'zustand';

const useConversationsStore = create((set) => ({
  conversations: {},
  lastRead: {},
  unreadCounts: {}, // Renomeado para plural (melhor semântica)

  // Atualiza uma conversa específica
  setConversation: (userId, data) => 
    set((state) => ({
      conversations: {
        ...state.conversations,
        [userId]: { 
          ...(state.conversations[userId] || {}), 
          ...data 
        }
      }
    })),

  // Marca todas as mensagens como lidas para um usuário
  markAsRead: (userId) =>
    set((state) => ({
      lastRead: {
        ...state.lastRead,
        [userId]: new Date().toISOString()
      },
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0 // Zera o contador
      }
    })),

  // Incrementa mensagens não lidas
  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1
      }
    })),

  // Remove completamente um contato (opcional)
  removeConversation: (userId) =>
    set((state) => {
      const newConversations = { ...state.conversations };
      const newUnreadCounts = { ...state.unreadCounts };
      delete newConversations[userId];
      delete newUnreadCounts[userId];
      return { conversations: newConversations, unreadCounts: newUnreadCounts };
    })
}));

export default useConversationsStore;
