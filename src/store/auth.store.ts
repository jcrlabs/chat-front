import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: { id: string; username: string } | null
  setTokens: (accessToken: string) => void
  setUser: (user: { id: string; username: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setTokens: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'chat-auth',
      partialize: (state) => ({ user: state.user }), // don't persist token
    }
  )
)
