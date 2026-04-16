import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '@/store/auth.store'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMessages, useEditMessage, useDeleteMessage } from '@/hooks/queries/use-messages'
import { useProfile } from '@/hooks/queries/use-profile'
import { useRoomMembers, useRooms, useUnreadCounts } from '@/hooks/queries/use-rooms'
import { roomsApi } from '@/api/rooms'
import { useDMs } from '@/hooks/queries/use-friends'
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
  const qc = useQueryClient()
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const [typingUsernames, setTypingUsernames] = useState<string[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const initialUnreadApplied = useRef(false)
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const { data: allRooms } = useRooms()
  const { data: allDMs } = useDMs()
  const { data: initialUnread } = useUnreadCounts()
  const { data: roomMembers } = useRoomMembers(activeRoom?.id ?? null)
  const myRole: MemberRole = roomMembers?.find((m) => m.user_id === user?.id)?.role ?? 'member'
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()

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
    if (msg.type === 'chat_message') {
      if (msg.room_id === activeRoom?.id) {
        const newMsg: Message = {
          id: msg.message_id ?? `live-${msg.user_id}-${msg.timestamp}-${Math.random()}`,
          room_id: msg.room_id!, user_id: msg.user_id!, username: msg.username!,
          display_name: msg.display_name, avatar_url: msg.avatar_url,
          content: msg.content!, created_at: msg.timestamp!,
        }
        setLiveMessages((prev) => {
          if (msg.user_id === user?.id) {
            const tempIdx = prev.findIndex((m) => m.id.startsWith('temp-') && m.content === msg.content)
            if (tempIdx !== -1) {
              const next = [...prev]; next[tempIdx] = newMsg; return next
            }
          }
          return [...prev, newMsg]
        })
      } else if (msg.room_id && msg.user_id !== user?.id) {
        setUnreadCounts((prev) => ({ ...prev, [msg.room_id!]: (prev[msg.room_id!] ?? 0) + 1 }))
      }
      return
    }
    if (msg.type === 'message_edited' && msg.room_id === activeRoom?.id && msg.message_id) {
      setLiveMessages((prev) => prev.map((m) =>
        m.id === msg.message_id ? { ...m, content: msg.content ?? m.content, edited_at: msg.edited_at ?? m.edited_at } : m
      ))
      qc.invalidateQueries({ queryKey: ['messages', msg.room_id] })
      return
    }
    if (msg.type === 'message_deleted' && msg.room_id === activeRoom?.id && msg.message_id) {
      setLiveMessages((prev) => prev.filter((m) => m.id !== msg.message_id))
      qc.invalidateQueries({ queryKey: ['messages', msg.room_id] })
      return
    }
    if (msg.type === 'room_renamed' && msg.room_id && msg.name) {
      if (activeRoom?.id === msg.room_id) setActiveRoom((r) => r ? { ...r, name: msg.name! } : r)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      return
    }
    if (msg.type.startsWith('voice_') || msg.type === 'ice_candidate') { handleVoiceMessage(msg); return }
    if (msg.type === 'typing' && msg.room_id === activeRoom?.id && msg.user_id !== user?.id) {
      const uid = msg.user_id!
      const uname = msg.display_name || msg.username!
      const timers = typingTimers.current
      if (timers.has(uid)) clearTimeout(timers.get(uid))
      timers.set(uid, setTimeout(() => { timers.delete(uid); setTypingUsernames((n) => n.filter((x) => x !== uname)) }, 3000))
      setTypingUsernames((prev) => prev.includes(uname) ? prev : [...prev, uname])
    }
  }, [activeRoom, user?.id, qc])

  const { connected, send } = useWebSocket(wsUrl, { onMessage: handleWSMessage, enabled: !!accessToken })
  const { inVoice, participants, muted, micError, devices, micDeviceId, speakerDeviceId, joinVoice, leaveVoice, toggleMute, changeMic, setSpeakerDevice, handleVoiceMessage, voiceDebugLog } = useWebRTC({
    roomId: activeRoom?.id ?? null, myUserId: user?.id ?? '', sendWS: send as (msg: object) => void, connected,
  })

  useEffect(() => {
    if (!activeRoom || !connected) return
    setLiveMessages([])
    send({ type: 'join_room', room_id: activeRoom.id })
  }, [activeRoom, connected, send])

  // Seed unread counts from API once on load
  useEffect(() => {
    if (!initialUnread || initialUnreadApplied.current) return
    initialUnreadApplied.current = true
    setUnreadCounts((prev) => {
      const next = { ...prev }
      initialUnread.forEach(({ room_id, count }) => {
        next[room_id] = (next[room_id] ?? 0) + count
      })
      return next
    })
  }, [initialUnread])

  // Subscribe to ALL user rooms so WS delivers messages for unread badge tracking
  useEffect(() => {
    if (!connected) return
    allRooms?.forEach((r) => send({ type: 'join_room', room_id: r.id }))
    allDMs?.forEach((dm) => send({ type: 'join_room', room_id: dm.id }))
  }, [connected, allRooms, allDMs, send])

  const handleSend = useCallback((content: string) => {
    if (!activeRoom || !user) return
    setLiveMessages((prev) => [...prev, {
      id: `temp-${Date.now()}-${Math.random()}`,
      room_id: activeRoom.id, user_id: user.id, username: user.username,
      display_name: user.displayName, avatar_url: user.avatarUrl,
      content, created_at: new Date().toISOString(),
    }])
    send({ type: 'chat_message', room_id: activeRoom.id, content })
  }, [activeRoom, user, send])

  const handleSelectRoom = (room: Room) => {
    if (activeRoom?.type === 'voice' && inVoice) leaveVoice()
    if (activeRoom) send({ type: 'leave_room', room_id: activeRoom.id })
    setActiveRoom(room)
    setTypingUsernames([])
    setSidebarOpen(false)
    setUnreadCounts((prev) => { const next = { ...prev }; delete next[room.id]; return next })
    roomsApi.markRead(room.id).catch(() => {})
  }

  return (
    <div className="flex h-svh overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={[
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200',
        'md:relative md:z-auto md:flex md:translate-x-0',
        sidebarOpen ? 'translate-x-0 animate-slide-in-left' : '-translate-x-full',
      ].join(' ')}>
        <RoomList
          activeRoomId={activeRoom?.id ?? null}
          onSelect={handleSelectRoom}
          onRoomDeleted={(id) => { if (activeRoom?.id === id) setActiveRoom(null) }}
          devices={devices} micDeviceId={micDeviceId} speakerDeviceId={speakerDeviceId}
          onChangeMic={changeMic} onChangeSpeaker={setSpeakerDevice}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Main area */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ background: 'var(--bg)' }}>
        {activeRoom ? (
          <>
            {/* Topbar */}
            <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <button className="md:hidden shrink-0 flex size-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text2)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                onClick={() => setSidebarOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                {activeRoom.type === 'dm' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text2)', flexShrink: 0 }}><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                ) : activeRoom.type === 'voice' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--success)', flexShrink: 0 }}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                ) : (
                  <span className="font-light text-lg shrink-0" style={{ color: 'var(--text3)' }}>#</span>
                )}
                <h1 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{activeRoom.name}</h1>
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${connected ? '' : ''}`}
                    style={{ background: connected ? 'var(--success)' : 'var(--text3)' }} />
                  <span className="hidden sm:block text-xs" style={{ color: 'var(--text3)' }}>
                    {connected ? 'Live' : 'Connecting…'}
                  </span>
                </div>

                {activeRoom.type !== 'voice' && (
                  <button onClick={() => inVoice ? leaveVoice() : joinVoice()}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: inVoice ? 'var(--success)' : 'var(--text3)', background: inVoice ? '#22c55e15' : undefined }}
                    onMouseEnter={(e) => !inVoice && (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={(e) => !inVoice && (e.currentTarget.style.background = '')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                  </button>
                )}

                <button onClick={() => setMembersOpen((v) => !v)}
                  className="flex size-8 items-center justify-center rounded-lg transition-colors"
                  style={{ color: membersOpen ? 'var(--text)' : 'var(--text3)', background: membersOpen ? 'var(--surface2)' : undefined }}
                  onMouseEnter={(e) => !membersOpen && (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => !membersOpen && (e.currentTarget.style.background = '')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                </button>
              </div>
            </div>

            {activeRoom.type === 'voice' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                {/* Debug log — always visible in voice rooms when there are entries */}
                {voiceDebugLog.length > 0 && !inVoice && (
                  <div className="w-full max-w-md max-h-40 overflow-y-auto rounded bg-[#0d0d0d] p-2 font-mono text-[10px] leading-relaxed text-[#8b949e]">
                    {voiceDebugLog.map((line, i) => (
                      <div key={i} className={line.includes('FAIL') || line.includes('ERROR') || line.includes('LOST') ? 'text-[#f04747]' : line.includes('OK') || line.includes('sent') ? 'text-[#3ba55d]' : ''}>{line}</div>
                    ))}
                  </div>
                )}
                {inVoice ? (
                  <VoicePanel participants={participants} muted={muted} devices={devices}
                    micDeviceId={micDeviceId} speakerDeviceId={speakerDeviceId}
                    onChangeMic={changeMic} onChangeSpeaker={setSpeakerDevice}
                    onToggleMute={toggleMute} onLeave={leaveVoice} debugLog={voiceDebugLog} />
                ) : micError ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl p-6 max-w-sm text-center"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex size-12 items-center justify-center rounded-full"
                      style={{ background: micError === 'notfound' ? '#f59e0b1a' : '#ef44441a' }}>
                      {micError === 'notfound' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f59e0b' }}>
                          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--danger)' }}>
                          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                      )}
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      {micError === 'notfound'
                        ? 'No se encontró micrófono'
                        : micError === 'denied'
                          ? 'Acceso al micrófono necesario'
                          : 'Micrófono bloqueado'}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>
                      {micError === 'notfound'
                        ? 'Conecta un micrófono o auriculares e inténtalo de nuevo.'
                        : micError === 'denied'
                          ? 'El navegador solicitará acceso a tu micrófono. Pulsa el botón de abajo y acepta cuando aparezca el diálogo.'
                          : micError === 'notfound' ? 'Conecta un micrófono o auriculares e inténtalo de nuevo.'
                          : micError?.startsWith('unknown:') ? micError.replace('unknown: ', '')
                          : 'El micrófono está bloqueado. Ve a los ajustes del navegador, busca los permisos de este sitio y activa el micrófono. Luego pulsa Reintentar.'}
                    </p>
                    {micError !== 'notfound' && (
                      <button onClick={joinVoice}
                        className="mt-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all"
                        style={{ background: 'var(--primary)' }}>
                        {micError === 'denied' ? 'Permitir micrófono' : 'Reintentar'}
                      </button>
                    )}
                    {micError === 'notfound' && (
                      <button onClick={joinVoice}
                        className="mt-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all"
                        style={{ background: 'var(--primary)' }}>
                        Reintentar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl" style={{ background: 'var(--surface)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--success)' }}>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                      </svg>
                    </div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>Canal de voz</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Pulsa para unirte — se pedirá acceso al micrófono</p>
                    <button onClick={joinVoice}
                      className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
                      style={{ background: 'var(--success)' }}>
                      Unirse al canal
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <MessageList
                  key={activeRoom.id}
                  roomId={activeRoom.id} liveMessages={liveMessages}
                  userId={user?.id ?? ''} myRole={myRole} isAdmin={user?.isAdmin ?? false}
                  onEdit={(id, content) => editMessage.mutate({ messageId: id, content, roomId: activeRoom.id })}
                  onDelete={(id) => deleteMessage.mutate({ messageId: id, roomId: activeRoom.id })}
                />
                <TypingIndicator usernames={typingUsernames} />
                <MessageInput onSend={handleSend}
                  onTyping={(t) => send({ type: 'typing', room_id: activeRoom.id, is_typing: t })}
                  disabled={!connected} channelName={activeRoom.name} />
                {inVoice && (
                  <VoicePanel participants={participants} muted={muted} devices={devices}
                    micDeviceId={micDeviceId} speakerDeviceId={speakerDeviceId}
                    onChangeMic={changeMic} onChangeSpeaker={setSpeakerDevice}
                    onToggleMute={toggleMute} onLeave={leaveVoice} debugLog={voiceDebugLog} />
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <button className="mb-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white md:hidden"
              style={{ background: 'var(--primary)' }}
              onClick={() => setSidebarOpen(true)}>
              Open channels
            </button>
            <div className="flex size-16 items-center justify-center rounded-2xl" style={{ background: 'var(--surface)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text3)' }}>
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium" style={{ color: 'var(--text)' }}>Pick a channel</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text3)' }}>Select from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </main>

      {/* Members panel */}
      {membersOpen && activeRoom && (
        <>
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden animate-fade-in" onClick={() => setMembersOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-30 animate-slide-in-right md:relative md:z-auto md:animate-none">
            <MembersPanel roomId={activeRoom.id} myUserId={user?.id ?? ''} myRole={myRole} onClose={() => setMembersOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}

function MessageList({ roomId, liveMessages, userId, myRole, isAdmin, onEdit, onDelete }: {
  roomId: string; liveMessages: Message[]; userId: string; myRole: MemberRole
  isAdmin: boolean; onEdit: (id: string, content: string) => void; onDelete: (id: string) => void
}) {
  const { data, isLoading, fetchNextPage, hasNextPage } = useMessages(roomId)
  const parentRef = useRef<HTMLDivElement>(null)
  const CONT_MS = 5 * 60 * 1000

  const allMessages = useMemo(() => {
    const paged = data?.pages.slice().reverse().flatMap((p) => [...p].reverse()) ?? []
    const seen = new Set<string>()
    return [...paged, ...liveMessages]
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [data, liveMessages])

  const virtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      const isCont = i > 0
        && allMessages[i - 1].user_id === allMessages[i].user_id
        && new Date(allMessages[i].created_at).getTime() - new Date(allMessages[i - 1].created_at).getTime() < CONT_MS
      return isCont ? 28 : 64
    },
    overscan: 10,
  })

  // Scroll to bottom on initial load (once per mount = once per room, key={activeRoom.id}).
  // useLayoutEffect + scrollTop avoids the rAF timing issues with the virtualizer.
  const initialScrollDone = useRef(false)
  useLayoutEffect(() => {
    if (data && !initialScrollDone.current && allMessages.length > 0 && parentRef.current) {
      initialScrollDone.current = true
      parentRef.current.scrollTop = parentRef.current.scrollHeight
    }
  }, [!!data, allMessages.length])

  useEffect(() => {
    if (liveMessages.length > 0) virtualizer.scrollToIndex(allMessages.length - 1, { behavior: 'smooth' })
  }, [liveMessages.length])

  if (isLoading) return <MessageSkeleton />

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto py-4">
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}
          className="mb-2 w-full py-1 text-center text-xs transition-colors"
          style={{ color: 'var(--primary)' }}>
          Load older messages
        </button>
      )}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const msg = allMessages[item.index]
          const isCont = item.index > 0
            && allMessages[item.index - 1].user_id === msg.user_id
            && new Date(msg.created_at).getTime() - new Date(allMessages[item.index - 1].created_at).getTime() < CONT_MS
          return (
            <div key={item.key} style={{ position: 'absolute', top: item.start, width: '100%' }}>
              <ChatBubble message={msg} isOwn={msg.user_id === userId} isContinuation={isCont}
                myRole={myRole} isAdmin={isAdmin}
                onEdit={msg.user_id === userId ? onEdit : undefined}
                onDelete={onDelete} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
