// src/socket.js
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// Cria o cliente, mas não conecta automaticamente
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 3
})

// Chama isso para iniciar a conexão
export function connectSocket() {
  if (!socket.connected) {
    console.log('[socket] Conectando ao servidor em', SOCKET_URL)
    socket.connect()
  }
}

// Para fechar
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

// Logs de debug da própria instância
socket.on('connect', () => {
  console.log('[socket] Conectado, id =', socket.id)
})
socket.on('connect_error', (err) => {
  console.error('[socket] Erro ao conectar:', err.message)
})
socket.on('disconnect', (reason) => {
  console.log('[socket] Desconectado:', reason)
})
