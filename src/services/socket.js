// src/socket.js
import { io } from 'socket.io-client'
import useConversationsStore from '../store/useConversationsStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 3,
})

// Conecta e registra listeners
export function connectSocket(userId) {
  if (!socket.connected) {
    console.log('[socket] Conectando ao servidor em', SOCKET_URL)
    socket.connect()

    socket.on('connect', () => {
      console.log('[socket] Conectado, id =', socket.id)

      if (userId) {
        socket.emit('join_room', userId)
        console.log(`[socket] Entrando na sala chat-${userId}`)
      }
    })

    // Listener de nova mensagem
    socket.on('new_message', (msg) => {
      const {
        user_id,
        content,
        timestamp,
        channel,
        name,
        ticket_number,
        fila,
      } = msg

      const {
        setConversation,
        incrementUnread,
        lastRead,
      } = useConversationsStore.getState()

      // Atualiza dados da conversa
      setConversation(user_id, {
        user_id,
        name,
        channel,
        fila,
        ticket_number,
        content,
        timestamp,
      })

      // Verifica se é uma nova não lida
      const lastSeen = lastRead[user_id]
      const msgTime = new Date(timestamp).getTime()
      const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0

      if (msgTime > lastSeenTime) {
        incrementUnread(user_id)
      }
    })

    // Listener opcional de resposta de bot
    socket.on('bot_response', (data) => {
      console.log('[socket] Resposta do bot:', data)
      // Use conforme necessário
    })
  }
}

// Desconecta e limpa
export function disconnectSocket(userId) {
  if (socket.connected) {
    if (userId) {
      socket.emit('leave_room', userId)
      console.log(`[socket] Saindo da sala chat-${userId}`)
    }
    socket.disconnect()
  }
}

// Logs de debug padrão
socket.on('connect_error', (err) => {
  console.error('[socket] Erro ao conectar:', err.message)
})

socket.on('disconnect', (reason) => {
  console.log('[socket] Desconectado:', reason)
})
