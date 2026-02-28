import { io } from 'socket.io-client'
import { tokenStorage } from './tokenStorage.js'

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: tokenStorage.getAccess() }),
})

export function useSocket() {
  function connect() {
    if (!socket.connected) socket.connect()
  }

  function disconnect() {
    if (socket.connected) socket.disconnect()
  }

  return { socket, connect, disconnect }
}
