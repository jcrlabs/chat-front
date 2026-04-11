import { useState } from 'react'
import { useInviteUser } from '@/hooks/queries/use-rooms'
import { api } from '@/api/client'
import type { User } from '@/types'

interface Props {
  roomId: string
  roomName: string
  onClose: () => void
}

export function InviteModal({ roomId, roomName, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const inviteUser = useInviteUser()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    try {
      const { data } = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query.trim())}`)
      setResults(data)
    } catch {
      setError('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleInvite = (userId: string) => {
    inviteUser.mutate(
      { roomId, userId },
      {
        onSuccess: () => setInvited((prev) => new Set(prev).add(userId)),
        onError: () => setError('Invite failed'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md mx-4 rounded-lg bg-[#313338] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#f2f3f5]">Invite to #{roomName}</h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#dbdee1]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or tag (user#0000)"
            className="flex-1 rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] placeholder-[#6d6f78] outline-none focus:ring-1 focus:ring-[#5865f2]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded bg-[#5865f2] px-3 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50"
          >
            Search
          </button>
        </form>

        {error && <p className="mb-3 text-xs text-[#f04747]">{error}</p>}

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.length === 0 && !searching && query && (
            <p className="text-sm text-[#6d6f78] text-center py-4">No users found</p>
          )}
          {results.map((user) => {
            const name = user.displayName || user.username
            const alreadyInvited = invited.has(user.id)
            return (
              <div key={user.id} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-[#35373c]">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white select-none">
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f2f3f5] truncate">{name}</p>
                  <p className="text-xs text-[#949ba4]">{user.username}#{user.tag}</p>
                </div>
                <button
                  onClick={() => handleInvite(user.id)}
                  disabled={alreadyInvited}
                  className="shrink-0 rounded bg-[#5865f2] px-3 py-1 text-xs font-medium text-white hover:bg-[#4752c4] disabled:bg-[#35373c] disabled:text-[#6d6f78]"
                >
                  {alreadyInvited ? 'Invited' : 'Invite'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
