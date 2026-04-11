import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '@/store/auth.store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMessages } from '@/hooks/queries/use-messages'
import { useProfile } from '@/hooks/queries/use-profile'
import { RoomList } from '@/components/chat/RoomList'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import type { Room, Message, WSServerMessage } from '@/types'

export function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [typingUsernames, setTypingUsernames] = useState<string[]>([])
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load profile on mount to sync displayName and avatarUrl into the store
  const { data: profile } = useProfile()
  useEffect(() => {
    if (!profile) return
    updateUser({
      displayName: profile.display_name,
      avatarUrl: profile.has_avatar ? `/api/users/${profile.id}/avatar` : undefined,
    })
  }, [profile, updateUser])

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
        display_name: msg.display_name,
        avatar_url: msg.avatar_url,
        content: msg.content!,
        created_at: msg.timestamp!,
      }
      setLiveMessages((prev) => [...prev, message])
    }

    if (msg.type === 'typing' && msg.room_id === activeRoom.id && msg.user_id !== user?.id) {
      const uid = msg.user_id!
      const uname = msg.display_name || msg.username!
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
    <div className="flex h-screen bg-[#313338] text-[#dcddde]">
      <RoomList activeRoomId={activeRoom?.id ?? null} onSelect={handleSelectRoom} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#1e1f22] px-4 shadow-sm">
              {activeRoom.type === 'dm' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#80848e] shrink-0">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              ) : (
                <span className="text-[#80848e] text-lg font-light">#</span>
              )}
              <h1 className="font-semibold text-[#f2f3f5]">{activeRoom.name}</h1>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${connected ? 'bg-[#3ba55d]' : 'bg-[#80848e]'}`}
                  title={connected ? 'Connected' : 'Disconnected'}
                />
              </div>
            </div>

            <MessageList
              roomId={activeRoom.id}
              liveMessages={liveMessages}
              userId={user?.id ?? ''}
            />

            <TypingIndicator usernames={typingUsernames} />
            <MessageInput
              onSend={handleSend}
              onTyping={handleTyping}
              disabled={!connected}
              channelName={activeRoom.name}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#80848e]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <p className="text-sm">Select a channel to start chatting</p>
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

  const CONTINUATION_MS = 5 * 60 * 1000

  const virtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const isCont =
        index > 0 &&
        allMessages[index - 1].user_id === allMessages[index].user_id &&
        new Date(allMessages[index].created_at).getTime() -
          new Date(allMessages[index - 1].created_at).getTime() <
          CONTINUATION_MS
      return isCont ? 28 : 64
    },
    overscan: 10,
  })

  useEffect(() => {
    if (liveMessages.length > 0) {
      virtualizer.scrollToIndex(allMessages.length - 1, { behavior: 'smooth' })
    }
  }, [liveMessages.length])

  if (isLoading) return <MessageSkeleton />

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto py-4">
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="mb-2 w-full text-center text-xs text-[#5865f2] hover:text-[#7289da] py-1"
        >
          Load older messages
        </button>
      )}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const msg = allMessages[item.index]
          const isContinuation =
            item.index > 0 &&
            allMessages[item.index - 1].user_id === msg.user_id &&
            new Date(msg.created_at).getTime() -
              new Date(allMessages[item.index - 1].created_at).getTime() <
              CONTINUATION_MS

          return (
            <div key={item.key} style={{ position: 'absolute', top: item.start, width: '100%' }}>
              <ChatBubble message={msg} isOwn={msg.user_id === userId} isContinuation={isContinuation} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
