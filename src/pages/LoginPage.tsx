import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { jwtDecode } from '@/lib/jwt'
import { queryClient } from '@/lib/queryClient'

export function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await authApi.login(email, password)
      queryClient.clear()
      setTokens(access_token)
      const payload = jwtDecode(access_token)
      setUser({ id: payload.sub, username: payload.username, isAdmin: payload.is_admin ?? false })
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4" style={{ background: 'var(--bg)' }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-96 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--primary)' }} />
        <div className="absolute -bottom-40 -right-20 size-80 rounded-full opacity-10 blur-3xl" style={{ background: '#8b5cf6' }} />
      </div>

      <div className="animate-slide-up relative w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>Sign in to continue to jcrlabs</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: '#ef44441a', color: 'var(--danger)', border: '1px solid #ef444430' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-h)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--text2)' }}>
          No account?{' '}
          <Link to="/register" className="font-medium transition-colors" style={{ color: 'var(--primary-h)' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
