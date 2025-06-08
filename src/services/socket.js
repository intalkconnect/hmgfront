// src/services/socket.js
import { io } from 'socket.io-client'
import useConversationsStore from '../store/useConversationsStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://seu-servidor-websocket.com'

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false // Conectamos manualmente
})

// Conecta e configura listeners
export function connectSocket(userId) {
  if (!socket.connected) {
    console.log('[socket] Conectando ao servidor...')
    socket.connect()

    socket.on('connect', () => {
      console.log('[socket] Conectado, ID:', socket.id)
      if (userId) joinRoom(userId)
    })

    socket.on('new_message', (message) => {
      console.log('[socket] Nova mensagem:', message)
      const store = useConversationsStore.getState()
      store.setConversation(message.user_id, message)
      if (message.user_id !== store.userIdSelecionado) {
        store.incrementUnread(message.user_id)
      }
    })

    socket.on('update_message', (message) => {
      console.log('[socket] Mensagem atualizada:', message)
      useConversationsStore.getState().setConversation(message.user_id, message)
    })
  }
}

// Funções auxiliares
export function joinRoom(userId) {
  socket.emit('join_room', userId)
  console.log(`[socket] Entrou na sala: ${userId}`)
}

export function leaveRoom(userId) {
  socket.emit('leave_room', userId)
  console.log(`[socket] Saiu da sala: ${userId}`)
}

// Desconecta
export function disconnectSocket(userId) {
  if (userId) leaveRoom(userId)
  if (socket.connected) {
    socket.disconnect()
    console.log('[socket] Desconectado')
  }
}

// Logs de erro
socket.on('connect_error', (err) => {
  console.error('[socket] Erro de conexão:', err.message)
})

socket.on('disconnect', (reason) => {
  console.log('[socket] Desconectado. Motivo:', reason)
})
