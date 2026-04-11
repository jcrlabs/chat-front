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
        className="w-full max-w-[460px] mx-4 rounded-lg bg-[#2b2d31] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#1e1f22] px-5 py-4">
          <h2 className="text-base font-semibold text-[#f2f3f5]">Add Friend</h2>
          <p className="mt-0.5 text-xs text-[#949ba4]">
            Enter the exact tag — format: <span className="font-mono text-[#dbdee1]">username#0000</span>
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="alice#0042"
              autoFocus
              className="w-full rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] placeholder-[#6d6f78] outline-none focus:ring-1 focus:ring-[#5865f2] font-mono"
            />
            {query && !isValidQuery && (
              <p className="mt-1 text-xs text-[#f04747]">Include the # and tag number, e.g. alice#0042</p>
            )}
          </div>

          {isValidQuery && results !== undefined && (
            results.length === 0 ? (
              <p className="text-center text-xs text-[#949ba4]">No user found with that tag</p>
            ) : (
              <ul className="space-y-1">
                {results.map((u: User) => (
                  <li key={u.id} className="flex items-center gap-3 rounded px-2 py-2 bg-[#35373c]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-sm font-bold text-white select-none">
                      {(u.displayName || u.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f2f3f5]">{u.displayName || u.username}</p>
                      <p className="text-xs text-[#949ba4] font-mono">{u.username}#{u.tag}</p>
                    </div>
                    <button
                      onClick={() => sendRequest.mutate(u.id)}
                      disabled={sendRequest.isPending || sendRequest.isSuccess}
                      className="shrink-0 rounded bg-[#5865f2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                Pending Requests ({requests.length})
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {requests.map((req: FriendRequest) => (
                  <li key={req.friendship_id} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-[#35373c]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#3ba55d] text-sm font-bold text-white select-none">
                      {(req.from.displayName || req.from.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f2f3f5]">{req.from.displayName || req.from.username}</p>
                      <p className="text-xs text-[#949ba4] font-mono">{req.from.username}#{req.from.tag}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => acceptRequest.mutate(req.friendship_id)}
                        className="rounded bg-[#3ba55d] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2d8c4e] transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeRequest.mutate(req.friendship_id)}
                        className="rounded bg-[#35373c] px-2.5 py-1 text-xs font-medium text-[#949ba4] hover:bg-[#f04747] hover:text-white transition-colors"
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

        <div className="flex justify-end border-t border-[#1e1f22] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-[#949ba4] hover:text-[#dbdee1] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
