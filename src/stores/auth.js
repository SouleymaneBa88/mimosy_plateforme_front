import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authService from '@/services/authService'

/** État global de session : identité réelle, tokens stockés et rôle backend. */
export const useAuthStore = defineStore('auth', () => {
  const user = ref(authService.getStoredUser())
  const isLoading = ref(false)
  const errorMessage = ref('')

  const isAuthenticated = computed(() => Boolean(localStorage.getItem('mimosy_access_token') && user.value))
  const role = computed(() => user.value?.role || '')

  async function login(credentials) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await authService.login(credentials)
      user.value = data.user
      return data
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function register(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      return await authService.register(payload)
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await authService.logout()
    user.value = null
  }

  return { user, role, isAuthenticated, isLoading, errorMessage, login, register, logout }
})
