import { useState } from 'react'
import { useSearchUsers, useSendFriendRequest, useFriendRequests, useAcceptFriendRequest, useRemoveFriend } from '@/hooks/queries/use-friends'
import type { User, FriendRequest } from '@/types'

interface Props {
  onClose: () => void
}

export function AddFriendModal({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const isValidQuery = query.includes('#') && query.split('#')[1]?.length > 0
  const { data: results } = useSearchUsers(isValidQuery ? query : '')
  const { data: requests } = useFriendRequests()
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeRequest = useRemoveFriend()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[460px] mx-4 rounded-lg shadow-xl"
        style={{ background: 'var(--surface2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Add Friend</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text2)' }}>
            Enter the exact tag — format: <span className="font-mono" style={{ color: 'var(--text)' }}>username#0000</span>
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="alice#0042"
              autoFocus
              className="w-full rounded px-3 py-2 text-sm outline-none font-mono transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {query && !isValidQuery && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>Include the # and tag number, e.g. alice#0042</p>
            )}
          </div>

          {isValidQuery && results !== undefined && (
            results.length === 0 ? (
              <p className="text-center text-xs" style={{ color: 'var(--text2)' }}>No user found with that tag</p>
            ) : (
              <ul className="space-y-1">
                {results.map((u: User) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded px-2 py-2"
                    style={{ background: 'var(--surface3)' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white select-none"
                      style={{ background: 'var(--primary)' }}
                    >
                      {(u.displayName || u.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.displayName || u.username}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{u.username}#{u.tag}</p>
                    </div>
                    <button
                      onClick={() => sendRequest.mutate(u.id)}
                      disabled={sendRequest.isPending || sendRequest.isSuccess}
                      className="shrink-0 rounded px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--primary)' }}
                      onMouseEnter={(e) => !(sendRequest.isPending || sendRequest.isSuccess) && (e.currentTarget.style.background = 'var(--primary-h)')}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                    >
                      {sendRequest.isSuccess ? 'Sent ✓' : 'Send Request'}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {requests && requests.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
                Pending Requests ({requests.length})
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {requests.map((req: FriendRequest) => (
                  <li
                    key={req.friendship_id}
                    className="flex items-center gap-3 rounded px-2 py-2"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white select-none"
                      style={{ background: 'var(--success)' }}
                    >
                      {(req.from.displayName || req.from.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{req.from.displayName || req.from.username}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text2)' }}>{req.from.username}#{req.from.tag}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => acceptRequest.mutate(req.friendship_id)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-white transition-colors"
                        style={{ background: 'var(--success)' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeRequest.mutate(req.friendship_id)}
                        className="rounded px-2.5 py-1 text-xs font-medium transition-colors"
                        style={{ background: 'var(--surface3)', color: 'var(--text2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text2)' }}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--text2)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text2)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
