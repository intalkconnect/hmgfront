// src/store/useConversationsStore.js
import { create } from 'zustand'

const useConversationsStore = create((set) => ({
  conversations: {},
  lastRead: {},

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

  setLastRead: (userId, timestamp) =>
    set((state) => ({
      lastRead: {
        ...state.lastRead,
        [userId]: timestamp,
      },
    })),

  clearConversations: () => set({ conversations: {}, lastRead: {} }),
}))

export default useConversationsStore
