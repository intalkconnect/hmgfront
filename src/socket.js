import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  // Em produção, você pode enviar token de auth via `auth: { token: ... }`
})

export function connectSocket() {
  if (!socket.connected) {
    socket.connect()
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}
