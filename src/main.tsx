import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { jwtDecode } from '@/lib/jwt'
import { queryClient } from '@/lib/queryClient'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { ChatPage } from '@/pages/ChatPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminPage } from '@/pages/AdminPage'
import './index.css'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

function doRefresh(setTokens: (t: string) => void, updateUser: (u: { isAdmin: boolean }) => void, logout: () => void) {
  return axios
    .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const payload = jwtDecode(res.data.access_token)
      setTokens(res.data.access_token)
      updateUser({ isAdmin: payload.is_admin ?? false })
    })
    .catch(() => { queryClient.clear(); logout() })
}

// On hard refresh, accessToken is lost (not persisted). If user is in store,
// attempt a silent token refresh before rendering any route.
function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setTokens = useAuthStore((s) => s.setTokens)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const [ready, setReady] = useState(!user || !!accessToken)

  // Silent refresh on page load (accessToken not persisted).
  useEffect(() => {
    if (!user || accessToken) return
    doRefresh(setTokens, updateUser, logout).finally(() => setReady(true))
  }, [])

  // Proactive refresh: schedule 1 min before expiry so WS token never expires mid-session.
  useEffect(() => {
    if (!accessToken) return
    let timer: ReturnType<typeof setTimeout>
    try {
      const { exp } = jwtDecode(accessToken)
      const msLeft = exp * 1000 - Date.now() - 60_000 // 1 min early
      if (msLeft <= 0) {
        doRefresh(setTokens, updateUser, logout)
        return
      }
      timer = setTimeout(() => doRefresh(setTokens, updateUser, logout), msLeft)
    } catch { /* malformed token — leave it to the server to reject */ }
    return () => clearTimeout(timer)
  }, [accessToken])

  if (!ready) return <div className="min-h-screen bg-[#313338]" />
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ChatPage />
                </RequireAuth>
              }
            />
            <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
