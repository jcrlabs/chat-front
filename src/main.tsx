import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { jwtDecode } from '@/lib/jwt'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { ChatPage } from '@/pages/ChatPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminPage } from '@/pages/AdminPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

// On hard refresh, accessToken is lost (not persisted). If user is in store,
// attempt a silent token refresh before rendering any route.
function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setTokens = useAuthStore((s) => s.setTokens)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const [ready, setReady] = useState(!user || !!accessToken)

  useEffect(() => {
    if (!user || accessToken) return
    axios
      .post(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const payload = jwtDecode(res.data.access_token)
        setTokens(res.data.access_token)
        updateUser({ isAdmin: payload.is_admin ?? false })
      })
      .catch(() => logout())
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="min-h-screen bg-[#313338]" />
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAdmin = useAuthStore((s) => s.user?.isAdmin)
  if (!accessToken) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
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
            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
