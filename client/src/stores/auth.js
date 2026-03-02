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
    const token = tokenStorage.getAccess()
    if (!token) return
    // Decode JWT payload (base64url → base64 → JSON) to get user id
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(b64))
      user.value = await api.get(`/users/${payload.id}`)
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

  async function updateProfile(fields) {
    loading.value = true
    error.value   = null
    try {
      const updated = await api.patch(`/users/${user.value.id}`, fields)
      user.value = updated
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Upsert (create or update) a single address for the current user.
   * `addressType` defaults to 'home'.  The response replaces auth.user so
   * the addresses array stays in sync.
   */
  async function upsertAddress(addressFields) {
    loading.value = true
    error.value   = null
    try {
      // POST /api/users/:id/addresses upserts by addressType
      const addresses = await api.post(`/users/${user.value.id}/addresses`, addressFields)
      user.value = { ...user.value, addresses }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true
    error.value   = null
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
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
    updateProfile,
    upsertAddress,
    changePassword,
  }
})
