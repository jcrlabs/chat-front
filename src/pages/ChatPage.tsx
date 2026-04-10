import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '@/store/auth.store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMessages } from '@/hooks/queries/use-messages'
import { RoomList } from '@/components/chat/RoomList'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import type { Room, Message, WSServerMessage } from '@/types'

export function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [typingUsernames, setTypingUsernames] = useState<string[]>([])
  // timer refs per user so we can clear them without storing in state
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const wsUrl = accessToken
    ? `${import.meta.env.VITE_WS_URL ?? 'wss://chat.jcrlabs.net/api'}/ws?token=${accessToken}`
    : ''

  const handleWSMessage = useCallback((msg: WSServerMessage) => {
    if (!activeRoom) return

    if (msg.type === 'chat_message' && msg.room_id === activeRoom.id) {
      const message: Message = {
        id: `live-${msg.user_id}-${msg.timestamp}-${Math.random()}`,
        room_id: msg.room_id!,
        user_id: msg.user_id!,
        username: msg.username!,
        content: msg.content!,
        created_at: msg.timestamp!,
      }
      setLiveMessages((prev) => [...prev, message])
    }

    if (msg.type === 'typing' && msg.room_id === activeRoom.id && msg.user_id !== user?.id) {
      const uid = msg.user_id!
      const uname = msg.username!
      const timers = typingTimers.current
      if (timers.has(uid)) clearTimeout(timers.get(uid))
      timers.set(uid, setTimeout(() => {
        timers.delete(uid)
        setTypingUsernames((names) => names.filter((n) => n !== uname))
      }, 3000))
      setTypingUsernames((prev) => prev.includes(uname) ? prev : [...prev, uname])
    }
  }, [activeRoom, user?.id])

  const { connected, send } = useWebSocket(wsUrl, {
    onMessage: handleWSMessage,
    enabled: !!accessToken,
  })

  useEffect(() => {
    if (!activeRoom || !connected) return
    setLiveMessages([])
    send({ type: 'join_room', room_id: activeRoom.id })
  }, [activeRoom, connected, send])

  const handleSelectRoom = (room: Room) => {
    if (activeRoom) send({ type: 'leave_room', room_id: activeRoom.id })
    setActiveRoom(room)
    setTypingUsernames([])
  }

  const handleSend = (content: string) => {
    if (!activeRoom) return
    send({ type: 'chat_message', room_id: activeRoom.id, content })
  }

  const handleTyping = (isTyping: boolean) => {
    if (!activeRoom) return
    send({ type: 'typing', room_id: activeRoom.id, is_typing: isTyping })
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <RoomList activeRoomId={activeRoom?.id ?? null} onSelect={handleSelectRoom} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-700 px-6 py-3">
              <span className="text-gray-400">#</span>
              <h1 className="font-semibold">{activeRoom.name}</h1>
              <span className={`ml-auto size-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
            </div>

            <MessageList roomId={activeRoom.id} liveMessages={liveMessages} userId={user?.id ?? ''} />

            <TypingIndicator usernames={typingUsernames} />
            <MessageInput onSend={handleSend} onTyping={handleTyping} disabled={!connected} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Select a room to start chatting
          </div>
        )}
      </main>
    </div>
  )
}

function MessageList({ roomId, liveMessages, userId }: { roomId: string; liveMessages: Message[]; userId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage } = useMessages(roomId)
  const parentRef = useRef<HTMLDivElement>(null)

  const allMessages = [
    ...(data?.pages.flatMap((p) => [...p].reverse()) ?? []),
    ...liveMessages,
  ]

  const virtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  useEffect(() => {
    if (liveMessages.length > 0) {
      virtualizer.scrollToIndex(allMessages.length - 1, { behavior: 'smooth' })
    }
  }, [liveMessages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <MessageSkeleton />

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="mb-4 w-full text-center text-xs text-indigo-400 hover:text-indigo-300"
        >
          Load older messages
        </button>
      )}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const msg = allMessages[item.index]
          return (
            <div key={item.key} style={{ position: 'absolute', top: item.start, width: '100%' }}>
              <div className="py-1">
                <ChatBubble message={msg} isOwn={msg.user_id === userId} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
