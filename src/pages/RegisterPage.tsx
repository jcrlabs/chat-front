import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { jwtDecode } from '@/lib/jwt'

export function RegisterPage() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await authApi.register(username, email, password)
      setTokens(access_token)
      const payload = jwtDecode(access_token)
      setUser({ id: payload.sub, username: payload.username })
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-800 p-6 sm:p-8">
        <h1 className="mb-6 text-xl font-bold text-white">Create account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
