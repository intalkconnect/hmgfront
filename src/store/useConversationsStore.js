// src/store/useConversationsStore.js
import { create } from 'zustand'

const useConversationsStore = create((set) => ({
  conversations: {},

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

  getConversation: (userId) => get().conversations[userId],
}))

export default useConversationsStore
