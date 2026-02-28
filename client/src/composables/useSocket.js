import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_API_BASE_URL, {
  autoConnect: false,
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
