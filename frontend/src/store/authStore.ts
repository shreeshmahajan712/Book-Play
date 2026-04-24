import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'

export interface User {
  _id: string
  name: string
  email: string
  role: 'Player' | 'Owner' | 'Admin'
  avatar: string | null
  phone: string | null
  isVerified: boolean
  createdAt: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null

  login:   (email: string, password: string) => Promise<void>
  register:(data: { name: string; email: string; password: string; role?: string }) => Promise<void>
  logout:  () => Promise<void>
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApi.login({ email, password })
          set({ user: res.data.data.user, isLoading: false })
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          throw err
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApi.register(data)
          set({ user: res.data.data.user, isLoading: false })
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try { await authApi.logout() } catch { /* ignore */ }
        set({ user: null, error: null })
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const res = await authApi.me()
          set({ user: res.data.data.user, isLoading: false })
        } catch {
          set({ user: null, isLoading: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'turf-auth',
      partialize: (state) => ({ user: state.user }), // Only persist user object
    }
  )
)
