import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  isAdmin?: boolean
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setTokens: (accessToken: string) => void
  setUser: (user: AuthUser) => void
  updateUser: (updates: Partial<Pick<AuthUser, 'displayName' | 'avatarUrl'>>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setTokens: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'chat-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
