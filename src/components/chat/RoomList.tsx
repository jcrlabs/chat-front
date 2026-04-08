import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRooms, useCreateRoom } from '@/hooks/queries/use-rooms'
import type { Room } from '@/types'

interface Props {
  activeRoomId: string | null
  onSelect: (room: Room) => void
}

export function RoomList({ activeRoomId, onSelect }: Props) {
  const { data: rooms, isLoading } = useRooms()
  const createRoom = useCreateRoom()
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createRoom.mutate({ name: newName.trim() }, {
      onSuccess: () => { setNewName(''); setShowForm(false) }
    })
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-700 bg-gray-900">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-sm font-semibold text-gray-300">Rooms</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          + New
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="px-4 pb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name"
            autoFocus
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
          />
        </form>
      )}

      <nav className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        )}
        {rooms?.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelect(room)}
            className={cn(
              'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
              room.id === activeRoomId
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
            )}
          >
            <span className="text-gray-500">#</span>
            <span className="truncate">{room.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
