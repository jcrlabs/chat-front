import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRooms, useCreateRoom } from '@/hooks/queries/use-rooms'
import { useAuthStore } from '@/store/auth.store'
import { ProfileModal } from '@/components/chat/ProfileModal'
import type { Room } from '@/types'

interface Props {
  activeRoomId: string | null
  onSelect: (room: Room) => void
}

export function RoomList({ activeRoomId, onSelect }: Props) {
  const { data: rooms, isLoading } = useRooms()
  const createRoom = useCreateRoom()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createRoom.mutate({ name: newName.trim() }, {
      onSuccess: () => { setNewName(''); setShowForm(false) }
    })
  }

  const displayName = user?.displayName || user?.username || '?'
  const initial = displayName[0].toUpperCase()

  return (
    <>
      <aside className="flex w-60 shrink-0 flex-col bg-[#2b2d31]">
        {/* Server header */}
        <div className="flex h-12 items-center border-b border-[#1e1f22] px-4 shadow-sm">
          <h1 className="flex-1 truncate text-sm font-semibold text-[#f2f3f5]">jcrlabs</h1>
        </div>

        {/* Channels section */}
        <div className="flex-1 overflow-y-auto pt-4">
          <div className="mb-1 flex items-center justify-between px-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
              Text Channels
            </span>
            <button
              onClick={() => setShowForm((v) => !v)}
              title="Create channel"
              className="text-[#949ba4] hover:text-[#dbdee1] transition-colors leading-none"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M9 1a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-2 0v-6H2a1 1 0 0 1 0-2h6V2a1 1 0 0 1 1-1Z"/>
              </svg>
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="px-2 pb-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="channel-name"
                autoFocus
                className="w-full rounded bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] placeholder-[#6d6f78] outline-none focus:ring-1 focus:ring-[#5865f2]"
              />
            </form>
          )}

          <nav className="space-y-0.5 px-2">
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-[#35373c]" />
                ))}
              </>
            )}
            {rooms?.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelect(room)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  room.id === activeRoomId
                    ? 'bg-[#404249] text-[#f2f3f5]'
                    : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]',
                )}
              >
                <span className="text-[#6d6f78] text-base leading-none">#</span>
                <span className="truncate">{room.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User bar */}
        <div className="flex h-[52px] items-center gap-2 bg-[#232428] px-2">
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-1 min-w-0 items-center gap-2 rounded px-1 py-1 hover:bg-[#35373c] transition-colors"
          >
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white select-none">
                  {initial}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium text-[#f2f3f5] leading-tight">{displayName}</p>
              <p className="truncate text-xs text-[#949ba4] leading-tight">{user?.username}</p>
            </div>
          </button>
          <button
            onClick={logout}
            title="Log out"
            className="shrink-0 text-[#949ba4] hover:text-[#f04747] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
