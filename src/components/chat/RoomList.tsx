import { useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { queryClient } from '@/lib/queryClient'
import { useRooms, useCreateRoom, useDeleteRoom, useRenameRoom, useMyInvites, useAcceptInvite, useDeclineInvite } from '@/hooks/queries/use-rooms'
import { useDMs, useFriendRequests, useFriends, useCreateDM } from '@/hooks/queries/use-friends'
import { useAuthStore } from '@/store/auth.store'
import { ProfileModal } from '@/components/chat/ProfileModal'
import { AddFriendModal } from '@/components/chat/AddFriendModal'
import { InviteModal } from '@/components/chat/InviteModal'
import type { Room, DMRoom, FriendEntry, RoomType } from '@/types'
import type { AudioDevices } from '@/hooks/useWebRTC'

interface Props {
  activeRoomId: string | null
  onSelect: (room: Room) => void
  onRoomDeleted?: (roomId: string) => void
  devices?: AudioDevices
  micDeviceId?: string
  speakerDeviceId?: string
  onChangeMic?: (id: string) => void
  onChangeSpeaker?: (id: string) => void
  unreadCounts?: Record<string, number>
}

const S = {
  sidebar: "flex w-64 shrink-0 flex-col h-full",
  header: "flex h-14 items-center border-b px-4 shrink-0",
  scrollArea: "flex-1 overflow-y-auto py-2 space-y-1",
  sectionLabel: "mb-1 flex items-center justify-between px-3 pt-3",
  sectionTitle: "text-[10px] font-bold uppercase tracking-widest",
  rowBase: "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
  iconBtn: "shrink-0 flex items-center justify-center rounded-md size-6 transition-colors",
  badge: "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
} as const

function Avatar({ name, url, size = 7 }: { name: string; url?: string | null; size?: number }) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#22c55e','#3b82f6']
  const color = colors[name.charCodeAt(0) % colors.length]
  const cls = `flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white select-none size-${size}`
  if (url) return <img src={url} alt="" className={`${cls} object-cover`} />
  return <div className={cls} style={{ background: color }}>{name[0].toUpperCase()}</div>
}

export function RoomList({ activeRoomId, onSelect, onRoomDeleted, devices, micDeviceId = '', speakerDeviceId = '', onChangeMic, onChangeSpeaker, unreadCounts = {} }: Props) {
  const { data: rooms, isLoading } = useRooms()
  const { data: dms } = useDMs()
  const { data: friends } = useFriends()
  const { data: friendRequests } = useFriendRequests()
  const { data: myInvites } = useMyInvites()
  const createRoom = useCreateRoom()
  const deleteRoom = useDeleteRoom()
  const renameRoom = useRenameRoom()
  const createDM = useCreateDM()
  const acceptInvite = useAcceptInvite()
  const declineInvite = useDeclineInvite()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = user?.isAdmin ?? false

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<RoomType>('public')
  const [showForm, setShowForm] = useState(false)
  const [voiceNewName, setVoiceNewName] = useState('')
  const [showVoiceForm, setShowVoiceForm] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [inviteRoom, setInviteRoom] = useState<Room | null>(null)
  const [friendsOpen, setFriendsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [invitesOpen, setInvitesOpen] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createRoom.mutate({ name: newName.trim(), type: newType }, {
      onSuccess: () => { setNewName(''); setNewType('public'); setShowForm(false) }
    })
  }
  const handleCreateVoice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!voiceNewName.trim()) return
    createRoom.mutate({ name: voiceNewName.trim(), type: 'voice' }, {
      onSuccess: () => { setVoiceNewName(''); setShowVoiceForm(false) }
    })
  }
  const handleOpenDM = (userId: string) => {
    createDM.mutate(userId, { onSuccess: (room) => onSelect(room) })
  }
  const handleSelectDM = (dm: DMRoom) => {
    createDM.mutate(dm.other_user.id, { onSuccess: (room) => onSelect(room) })
  }
  const startRename = (room: Room) => { setRenamingId(room.id); setRenameValue(room.name) }
  const submitRename = (id: string) => {
    const t = renameValue.trim()
    if (t) renameRoom.mutate({ id, name: t }, { onSuccess: () => setRenamingId(null) })
    else setRenamingId(null)
  }
  const handleDeleteRoom = (room: Room) => {
    deleteRoom.mutate(room.id, { onSuccess: () => onRoomDeleted?.(room.id) })
  }

  const pendingCount = friendRequests?.length ?? 0
  const displayName = user?.displayName || user?.username || '?'

  const RenameInput = ({ id }: { id: string }) => (
    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') submitRename(id); if (e.key === 'Escape') setRenamingId(null) }}
      onBlur={() => submitRename(id)}
      className="flex-1 min-w-0 rounded-md px-2 py-0.5 text-sm outline-none focus:ring-1"
      style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--primary)' }} />
  )

  const RoomRow = ({ room }: { room: Room }) => {
    const isOwner = room.owner_id === user?.id
    const canManage = isOwner || isAdmin
    const isActive = room.id === activeRoomId
    const isRenaming = renamingId === room.id
    return (
      <div className={cn(S.rowBase, 'cursor-pointer', isActive ? 'text-white' : 'hover:text-white')}
        style={{ background: isActive ? 'var(--surface3)' : undefined, color: isActive ? 'var(--text)' : 'var(--text2)' }}
        onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'var(--surface3)')}
        onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = '')}>
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <span style={{ color: 'var(--text3)' }}>{room.type === 'private' ? '🔒' : '#'}</span>
            <RenameInput id={room.id} />
          </div>
        ) : (
          <button className="flex flex-1 items-center gap-1.5 min-w-0 text-left" onClick={() => onSelect(room)}>
            <span className="shrink-0 text-xs" style={{ color: 'var(--text3)' }}>
              {room.type === 'private' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              ) : '#'}
            </span>
            <span className="truncate text-sm">{room.name}</span>
            {(unreadCounts[room.id] ?? 0) > 0 && (
              <span className={S.badge} style={{ background: 'var(--primary)' }}>
                {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
              </span>
            )}
          </button>
        )}
        {!isRenaming && canManage && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {room.type === 'private' && isOwner && (
              <button onClick={() => setInviteRoom(room)} title="Invite" className={S.iconBtn}
                style={{ color: 'var(--text3)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </button>
            )}
            <button onClick={() => startRename(room)} title="Rename" className={S.iconBtn}
              style={{ color: 'var(--text3)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button onClick={() => handleDeleteRoom(room)} title="Delete" className={S.iconBtn}
              style={{ color: 'var(--text3)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <aside className={S.sidebar} style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        {/* Header */}
        <div className={S.header} style={{ borderColor: 'var(--border)' }}>
          <span className="flex-1 truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>jcrlabs</span>
        </div>

        {/* Scrollable content */}
        <nav className={S.scrollArea}>

          {/* Text Channels */}
          <div>
            <div className={S.sectionLabel}>
              <span className={S.sectionTitle} style={{ color: 'var(--text3)' }}>Channels</span>
              <button onClick={() => setShowForm((v) => !v)} title="New channel"
                className={S.iconBtn}
                style={{ color: 'var(--text3)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor"><path d="M9 1a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-2 0v-6H2a1 1 0 0 1 0-2h6V2a1 1 0 0 1 1-1Z"/></svg>
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleCreate} className="mx-2 mb-2 space-y-1.5 rounded-lg p-2" style={{ background: 'var(--surface2)' }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="channel-name" autoFocus
                  className="w-full rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setNewType((t) => t === 'public' ? 'private' : 'public')}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                    style={{ background: newType === 'private' ? 'var(--primary)' : 'var(--border)', color: 'var(--text)' }}>
                    {newType === 'private' ? '🔒 Private' : '# Public'}
                  </button>
                  <button type="submit" disabled={!newName.trim() || createRoom.isPending}
                    className="ml-auto rounded-md px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--primary)' }}>
                    Create
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-0.5 px-2">
              {isLoading && [1,2,3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg" style={{ background: 'var(--surface2)' }} />
              ))}
              {rooms?.filter((r) => r.type === 'public' || r.type === 'private').map((room) => (
                <RoomRow key={room.id} room={room} />
              ))}
            </div>
          </div>

          {/* Voice Channels */}
          <div>
            <div className={S.sectionLabel}>
              <button onClick={() => setVoiceOpen((v) => !v)} className="flex items-center gap-1.5 transition-colors"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text2)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"
                  className={cn('transition-transform shrink-0', voiceOpen ? 'rotate-90' : 'rotate-0')}>
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={S.sectionTitle} style={{ color: 'inherit' }}>Voice</span>
              </button>
              <button onClick={() => setShowVoiceForm((v) => !v)} title="New voice channel"
                className={S.iconBtn}
                style={{ color: 'var(--text3)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor"><path d="M9 1a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-2 0v-6H2a1 1 0 0 1 0-2h6V2a1 1 0 0 1 1-1Z"/></svg>
              </button>
            </div>

            {showVoiceForm && (
              <form onSubmit={handleCreateVoice} className="mx-2 mb-2 flex gap-1.5 rounded-lg p-2" style={{ background: 'var(--surface2)' }}>
                <input value={voiceNewName} onChange={(e) => setVoiceNewName(e.target.value)} placeholder="voice-channel" autoFocus
                  className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                <button type="submit" disabled={!voiceNewName.trim() || createRoom.isPending}
                  className="rounded-md px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--primary)' }}>
                  Add
                </button>
              </form>
            )}

            {voiceOpen && (
              <div className="space-y-0.5 px-2">
                {rooms?.filter((r) => r.type === 'voice').map((room) => {
                  const canManageVoice = room.owner_id === user?.id || isAdmin
                  const isRenaming = renamingId === room.id
                  const isActive = room.id === activeRoomId
                  return (
                    <div key={room.id} className={cn(S.rowBase, 'cursor-pointer')}
                      style={{ background: isActive ? 'var(--surface3)' : undefined, color: isActive ? 'var(--text)' : 'var(--text2)' }}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'var(--surface3)')}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = '')}>
                      {isRenaming ? (
                        <div className="flex flex-1 items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--success)', flexShrink: 0 }}>
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                          </svg>
                          <RenameInput id={room.id} />
                        </div>
                      ) : (
                        <button className="flex flex-1 items-center gap-1.5 min-w-0 text-left" onClick={() => onSelect(room)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--success)', flexShrink: 0 }}>
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                          </svg>
                          <span className="truncate text-sm">{room.name}</span>
                        </button>
                      )}
                      {!isRenaming && canManageVoice && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                          <button onClick={() => startRename(room)} className={S.iconBtn} style={{ color: 'var(--text3)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteRoom(room)} className={S.iconBtn} style={{ color: 'var(--text3)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pending Invites */}
          {myInvites && myInvites.length > 0 && (
            <div>
              <div className={S.sectionLabel}>
                <button onClick={() => setInvitesOpen((v) => !v)} className="flex items-center gap-1.5"
                  style={{ color: 'var(--text3)' }}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"
                    className={cn('transition-transform', invitesOpen ? 'rotate-90' : '')}>
                    <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className={S.sectionTitle} style={{ color: 'inherit' }}>Invites</span>
                  <span className={S.badge} style={{ background: 'var(--danger)' }}>{myInvites.length}</span>
                </button>
              </div>
              {invitesOpen && (
                <div className="space-y-1 px-2">
                  {myInvites.map((inv) => (
                    <div key={inv.id} className="rounded-lg p-2.5" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <p className="mb-2 text-xs truncate" style={{ color: 'var(--text2)' }}>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{inv.inviter_username}</span>
                        {' '}invited you to{' '}
                        <span className="font-medium" style={{ color: 'var(--text)' }}>#{inv.room_name}</span>
                      </p>
                      <div className="flex gap-1.5">
                        <button onClick={() => acceptInvite.mutate(inv.id)}
                          className="flex-1 rounded-md py-1 text-[11px] font-semibold text-white transition-colors"
                          style={{ background: 'var(--success)' }}>Accept</button>
                        <button onClick={() => declineInvite.mutate(inv.id)}
                          className="flex-1 rounded-md py-1 text-[11px] font-medium transition-colors"
                          style={{ background: 'var(--surface3)', color: 'var(--text2)' }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friends */}
          <div>
            <div className={S.sectionLabel}>
              <button onClick={() => setFriendsOpen((v) => !v)} className="flex items-center gap-1.5"
                style={{ color: 'var(--text3)' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"
                  className={cn('transition-transform', friendsOpen ? 'rotate-90' : '')}>
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={S.sectionTitle} style={{ color: 'inherit' }}>Friends</span>
                {pendingCount > 0 && <span className={S.badge} style={{ background: 'var(--danger)' }}>{pendingCount}</span>}
              </button>
              <button onClick={() => setShowAddFriend(true)}
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white transition-colors"
                style={{ background: 'var(--primary)' }}>
                + Add
              </button>
            </div>
            {friendsOpen && (
              <div className="space-y-0.5 px-2">
                {(!friends || friends.length === 0) && (
                  <p className="px-2 py-2 text-xs italic" style={{ color: 'var(--text3)' }}>No friends yet</p>
                )}
                {friends?.map((entry: FriendEntry) => {
                  const name = entry.user.displayName || entry.user.username
                  const avatarUrl = entry.user.avatarUrl ? `/api/users/${entry.user.id}/avatar` : null
                  return (
                    <button key={entry.friendship_id} onClick={() => handleOpenDM(entry.user.id)}
                      className={cn(S.rowBase, 'w-full text-left')}
                      style={{ color: 'var(--text2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text2)' }}>
                      <Avatar name={name} url={avatarUrl} size={6} />
                      <span className="truncate text-sm">{name}</span>
                      <div className="ml-auto size-1.5 rounded-full shrink-0" style={{ background: 'var(--success)' }} title="Online" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <div className={S.sectionLabel}>
              <button onClick={() => setDmsOpen((v) => !v)} className="flex items-center gap-1.5"
                style={{ color: 'var(--text3)' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"
                  className={cn('transition-transform', dmsOpen ? 'rotate-90' : '')}>
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={S.sectionTitle} style={{ color: 'inherit' }}>Messages</span>
              </button>
            </div>
            {dmsOpen && (
              <div className="space-y-0.5 px-2">
                {(!dms || dms.length === 0) && (
                  <p className="px-2 py-2 text-xs italic" style={{ color: 'var(--text3)' }}>No conversations yet</p>
                )}
                {dms?.map((dm) => {
                  const name = dm.other_user.display_name || dm.other_user.username
                  const isActive = dm.id === activeRoomId
                  const avatarUrl = dm.other_user.has_avatar ? `/api/users/${dm.other_user.id}/avatar` : null
                  return (
                    <button key={dm.id} onClick={() => handleSelectDM(dm)}
                      className={cn(S.rowBase, 'w-full text-left')}
                      style={{ background: isActive ? 'var(--surface3)' : undefined, color: isActive ? 'var(--text)' : 'var(--text2)' }}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'var(--surface3)')}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = '')}>
                      <Avatar name={name} url={avatarUrl} size={6} />
                      <span className="truncate text-sm">{name}</span>
                      {(unreadCounts[dm.id] ?? 0) > 0 && (
                        <span className={S.badge} style={{ background: 'var(--primary)' }}>
                          {unreadCounts[dm.id] > 99 ? '99+' : unreadCounts[dm.id]}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-t px-3 py-3 space-y-3 shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text3)' }}>Audio</p>
            {(['Microphone', 'Speaker'] as const).map((label) => {
              const isMic = label === 'Microphone'
              return (
                <div key={label}>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{label}</label>
                  <select value={isMic ? micDeviceId : speakerDeviceId}
                    onChange={(e) => isMic ? onChangeMic?.(e.target.value) : onChangeSpeaker?.(e.target.value)}
                    className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {isMic
                      ? ((!devices || devices.mics.length === 0) ? <option value="">Default</option> : devices?.mics.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,6)}`}</option>))
                      : (<><option value="">Default</option>{devices?.speakers.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0,6)}`}</option>)}</>)
                    }
                  </select>
                </div>
              )
            })}
          </div>
        )}

        {/* User bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-2 border-t" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <button onClick={() => setShowProfile(true)} className="flex flex-1 min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = ''}>
            <div className="relative shrink-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                : <Avatar name={displayName} size={8} />}
              <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2" style={{ background: 'var(--success)', borderColor: 'var(--surface2)' }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>{displayName}</p>
              <p className="truncate text-[11px] leading-tight" style={{ color: 'var(--text3)' }}>{user?.username}</p>
            </div>
          </button>

          <button onClick={() => setShowSettings((v) => !v)} title="Audio settings"
            className="shrink-0 flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: showSettings ? 'var(--text)' : 'var(--text3)', background: showSettings ? 'var(--surface3)' : undefined }}
            onMouseEnter={(e) => { if (!showSettings) { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' } }}
            onMouseLeave={(e) => { if (!showSettings) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text3)' } }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>

          {isAdmin && (
            <a href="/admin" title="Admin"
              className="shrink-0 flex size-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--warn)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </a>
          )}

          <button onClick={() => { queryClient.clear(); logout() }} title="Sign out"
            className="shrink-0 flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--surface3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = '' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {showProfile && createPortal(<ProfileModal onClose={() => setShowProfile(false)} />, document.body)}
      {showAddFriend && createPortal(<AddFriendModal onClose={() => setShowAddFriend(false)} />, document.body)}
      {inviteRoom && createPortal(<InviteModal roomId={inviteRoom.id} roomName={inviteRoom.name} onClose={() => setInviteRoom(null)} />, document.body)}
    </>
  )
}
