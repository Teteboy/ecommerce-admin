import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

// Create authenticated axios instance
const authAxios = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'super_admin' || user.value?.role === 'admin')
  const isManager = computed(() => user.value?.role === 'manager' || isAdmin.value)

  // Initialize auth state from localStorage
  const initialize = () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')

    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
      // Set Authorization header for authenticated axios instance
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      console.log('Auth initialized: Token set in authAxios headers, token length:', storedToken.length)
    } else {
      console.log('Auth initialized: No stored token found')
    }
  }

  // Initialize on store creation
  initialize()

  // Login
  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true
      console.log('Frontend: Attempting login with:', { email, passwordLength: password.length })

      // Create axios instance with explicit headers for login
      const loginAxios = axios.create()
      const response = await loginAxios.post('/api/auth/login', { email, password }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Frontend: Login response:', response.data)

      const { token: authToken, user: userData } = response.data.data
      console.log('Frontend: Extracted token and user:', { tokenLength: authToken.length, user: userData })

      token.value = authToken
      user.value = userData

      // Store in localStorage
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('auth_user', JSON.stringify(userData))

      // Set Authorization header for authenticated axios instance
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
      console.log('Frontend: Set Authorization header in authAxios:', authAxios.defaults.headers.common['Authorization'])

      useToast().success('Login successful!')
      return true
    } catch (error: any) {
      console.error('Login error:', error)
      const message = error.response?.data?.message || 'Login failed'
      useToast().error(message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  const logout = async () => {
    try {
      await authAxios.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state
      token.value = null
      user.value = null

      // Clear localStorage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')

      // Remove axios header
      delete authAxios.defaults.headers.common['Authorization']

      useToast().success('Logged out successfully')
    }
  }

  // Get current user profile
  const fetchProfile = async () => {
    try {
      const response = await authAxios.get('/auth/profile')
      user.value = response.data.data
      localStorage.setItem('auth_user', JSON.stringify(response.data.data))
    } catch (error: any) {
      console.error('Fetch profile error:', error)
      if (error.response?.status === 401) {
        await logout()
      }
    }
  }

  // Update profile
  const updateProfile = async (data: Partial<User>) => {
    try {
      isLoading.value = true
      const response = await authAxios.put('/auth/profile', data)

      user.value = { ...user.value!, ...response.data.data }
      localStorage.setItem('auth_user', JSON.stringify(user.value))

      useToast().success('Profile updated successfully!')
      return true
    } catch (error: any) {
      console.error('Update profile error:', error)
      const message = error.response?.data?.message || 'Failed to update profile'
      useToast().error(message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      isLoading.value = true
      await authAxios.put('/auth/change-password', {
        currentPassword,
        newPassword
      })

      useToast().success('Password changed successfully!')
      return true
    } catch (error: any) {
      console.error('Change password error:', error)
      const message = error.response?.data?.message || 'Failed to change password'
      useToast().error(message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Check if user has permission
  const hasPermission = (requiredRole: string) => {
    if (!user.value) return false

    const roleHierarchy = {
      'manager': 1,
      'admin': 2,
      'super_admin': 3
    }

    const userLevel = roleHierarchy[user.value.role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

    return userLevel >= requiredLevel
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isManager,
    initialize,
    login,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    hasPermission,
    authAxios
  }
})