import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../composables/useApi.js'
import { tokenStorage } from '../composables/tokenStorage.js'
import { useSocket } from '../composables/useSocket.js'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const loading = ref(false)
  const error   = ref(null)
  const { connect, disconnect } = useSocket()

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin         = computed(() => user.value?.role === 'admin')

  function clearError() {
    error.value = null
  }

  async function fetchMe() {
    if (!tokenStorage.getAccess()) return
    try {
      user.value = await api.get('/auth/me')
      connect()
    } catch {
      user.value = null
      tokenStorage.clear()
    }
  }

  async function login(email, password, remember = false) {
    loading.value = true
    error.value   = null
    try {
      const res = await api.post('/auth/login', { email, password })
      tokenStorage.save(res.accessToken, res.refreshToken, remember)
      user.value = res.user
      connect()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(username, email, password) {
    loading.value = true
    error.value   = null
    try {
      const res = await api.post('/auth/register', { username, email, password })
      tokenStorage.save(res.accessToken, res.refreshToken, false)
      user.value = res.user
      connect()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    const refreshToken = tokenStorage.getRefresh()
    await api.post('/auth/logout', { refreshToken }).catch(() => {})
    tokenStorage.clear()
    user.value = null
    disconnect()
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    clearError,
    fetchMe,
    login,
    register,
    logout,
  }
})
