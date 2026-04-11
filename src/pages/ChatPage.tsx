import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '@/store/auth.store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMessages } from '@/hooks/queries/use-messages'
import { useProfile } from '@/hooks/queries/use-profile'
import { useRoomMembers } from '@/hooks/queries/use-rooms'
import { RoomList } from '@/components/chat/RoomList'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { MembersPanel } from '@/components/chat/MembersPanel'
import { VoicePanel } from '@/components/chat/VoicePanel'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import { useWebRTC } from '@/hooks/useWebRTC'
import type { MemberRole, Room, Message, WSServerMessage } from '@/types'

export function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [membersOpen, setMembersOpen] = useState(false)
  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [typingUsernames, setTypingUsernames] = useState<string[]>([])
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const { data: roomMembers } = useRoomMembers(activeRoom?.id ?? null)
  const myRole: MemberRole = roomMembers?.find((m) => m.user_id === user?.id)?.role ?? 'member'

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

    if (msg.type.startsWith('voice_') || msg.type === 'ice_candidate') {
      handleVoiceMessage(msg)
      return
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

  const { inVoice, participants, muted, joinVoice, leaveVoice, toggleMute, handleVoiceMessage } = useWebRTC({
    roomId: activeRoom?.id ?? null,
    myUserId: user?.id ?? '',
    sendWS: send as (msg: object) => void,
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
    setSidebarOpen(false) // auto-close on mobile when room selected
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
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:flex',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <RoomList
          activeRoomId={activeRoom?.id ?? null}
          onSelect={handleSelectRoom}
        />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {activeRoom ? (
          <>
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#1e1f22] px-4 shadow-sm">
              {/* Mobile: back/hamburger button */}
              <button
                className="md:hidden shrink-0 text-[#80848e] hover:text-[#dbdee1] mr-1"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
              </button>
              {activeRoom.type === 'dm' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#80848e] shrink-0">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              ) : (
                <span className="text-[#80848e] text-lg font-light">#</span>
              )}
              <h1 className="font-semibold text-[#f2f3f5] truncate">{activeRoom.name}</h1>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <span
                  className={`size-2 rounded-full ${connected ? 'bg-[#3ba55d]' : 'bg-[#80848e]'}`}
                  title={connected ? 'Connected' : 'Disconnected'}
                />
                <button
                  onClick={() => inVoice ? leaveVoice() : joinVoice()}
                  title={inVoice ? 'Leave voice' : 'Join voice'}
                  className={`transition-colors ${inVoice ? 'text-[#3ba55d] hover:text-[#f04747]' : 'text-[#80848e] hover:text-[#dbdee1]'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setMembersOpen((v) => !v)}
                  title="Members"
                  className={`text-[#80848e] hover:text-[#dbdee1] transition-colors ${membersOpen ? 'text-[#dbdee1]' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                </button>
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
            {inVoice && (
              <VoicePanel
                participants={participants}
                muted={muted}
                onToggleMute={toggleMute}
                onLeave={leaveVoice}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#80848e]">
            {/* Mobile: show hamburger when no room and sidebar closed */}
            <button
              className="md:hidden mb-2 rounded bg-[#5865f2] px-4 py-2 text-sm font-medium text-white"
              onClick={() => setSidebarOpen(true)}
            >
              Open channels
            </button>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <p className="text-sm">Select a channel to start chatting</p>
          </div>
        )}
      </main>

      {membersOpen && activeRoom && (
        <MembersPanel
          roomId={activeRoom.id}
          myUserId={user?.id ?? ''}
          myRole={myRole}
          onClose={() => setMembersOpen(false)}
        />
      )}
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
