import { ref, readonly } from 'vue'
import { io } from 'socket.io-client'
import { tokenStorage } from './tokenStorage.js'
import { api } from './useApi.js'

// Singleton socket instance
const socket = io(import.meta.env.VITE_API_BASE_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: tokenStorage.getAccess() }),
})

// Reactive state shared across all callers
const isConnected = ref(false)
const socketUuid  = ref(null)

socket.on('connect',     () => { isConnected.value = true })
socket.on('disconnect',  () => { isConnected.value = false; socketUuid.value = null })
socket.on('socket:uuid', (uuid) => { socketUuid.value = uuid })

// If auth fails (e.g. expired access token), try to refresh then reconnect once
socket.on('connect_error', async (err) => {
  if (err.message !== 'Unauthorized') return
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return
  try {
    const data = await api.post('/auth/refresh', { refreshToken })
    tokenStorage.updateBoth(data.accessToken, data.refreshToken)
    socket.auth = (cb) => cb({ token: data.accessToken })
    socket.connect()
  } catch {
    // refresh failed — user must log in again
    tokenStorage.clear()
  }
})

export function useSocket() {
  function connect() {
    if (!socket.connected) {
      // Refresh auth token in case it changed since last connect
      socket.auth = (cb) => cb({ token: tokenStorage.getAccess() })
      socket.connect()
    }
  }

  function disconnect() {
    if (socket.connected) socket.disconnect()
  }

  return {
    socket,
    isConnected: readonly(isConnected),
    socketUuid:  readonly(socketUuid),
    connect,
    disconnect,
  }
}
