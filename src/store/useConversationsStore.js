// store/useConversationsStore.js
import { create } from 'zustand'

const useConversationsStore = create((set) => ({
  conversations: {},
  lastRead: {},
  unreadCount: {},

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
      unreadCount: {
        ...state.unreadCount,
        [userId]: 0,
      },
    })),

  incrementUnread: (userId) =>
    set((state) => ({
      unreadCount: {
        ...state.unreadCount,
        [userId]: (state.unreadCount[userId] || 0) + 1,
      },
    })),
}))

export default useConversationsStore
