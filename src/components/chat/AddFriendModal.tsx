import { useState } from 'react'
import { useSearchUsers, useSendFriendRequest, useFriendRequests, useAcceptFriendRequest, useRemoveFriend } from '@/hooks/queries/use-friends'
import type { User, FriendRequest } from '@/types'

interface Props {
  onClose: () => void
}

export function AddFriendModal({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const { data: results } = useSearchUsers(query)
  const { data: requests } = useFriendRequests()
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeRequest = useRemoveFriend()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[440px] rounded-lg bg-[#2b2d31] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#1e1f22] px-5 py-4">
          <h2 className="text-base font-semibold text-[#f2f3f5]">Add Friend</h2>
          <p className="mt-0.5 text-xs text-[#949ba4]">Search by username</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            autoFocus
            className="w-full rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] placeholder-[#6d6f78] outline-none focus:ring-1 focus:ring-[#5865f2]"
          />

          {results && results.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((u: User) => (
                <li key={u.id} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-[#35373c]">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white select-none">
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-[#f2f3f5]">{u.displayName || u.username}</p>
                    <p className="truncate text-xs text-[#949ba4]">@{u.username}</p>
                  </div>
                  <button
                    onClick={() => sendRequest.mutate(u.id)}
                    disabled={sendRequest.isPending}
                    className="shrink-0 rounded bg-[#5865f2] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && results?.length === 0 && (
            <p className="text-center text-xs text-[#949ba4]">No users found</p>
          )}

          {requests && requests.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                Pending Requests
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {requests.map((req: FriendRequest) => (
                  <li key={req.friendship_id} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-[#35373c]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#3ba55d] text-xs font-bold text-white select-none">
                      {(req.from.displayName || req.from.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-[#f2f3f5]">{req.from.displayName || req.from.username}</p>
                      <p className="truncate text-xs text-[#949ba4]">@{req.from.username}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
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
