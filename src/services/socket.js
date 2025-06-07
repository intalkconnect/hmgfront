// src/socket.js
import { io } from 'socket.io-client'

// Altere conforme sua lógica de estado ou store
// Exemplo fictício:
// import { useChatStore } from '@/stores/chatStore'
// const store = useChatStore()

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 3
})

// Conecta e registra listeners
export function connectSocket(userId) {
  if (!socket.connected) {
    console.log('[socket] Conectando ao servidor em', SOCKET_URL)
    socket.connect()

    socket.on('connect', () => {
      console.log('[socket] Conectado, id =', socket.id)

      // Entra na sala do usuário após conectar
      if (userId) {
        socket.emit('join_room', userId)
        console.log(`[socket] Entrando na sala chat-${userId}`)
      }
    })

    socket.on('new_message', (data) => {
      console.log('[socket] Nova mensagem recebida:', data)
      // Exemplo: store.addMessage(data)
    })

    socket.on('bot_response', (data) => {
      console.log('[socket] Resposta do bot:', data)
      // Exemplo: store.addMessage({
      //   direction: 'outgoing',
      //   user_id: data.user_id,
      //   content: data.response?.content || '[resposta]',
      //   timestamp: new Date().toISOString()
      // })
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
