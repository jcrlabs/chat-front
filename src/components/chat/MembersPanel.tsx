import { useRoomMembers, useSetMemberRole, useKickMember } from '@/hooks/queries/use-rooms'
import type { MemberRole } from '@/types'

interface Props {
  roomId: string
  myUserId: string
  myRole: MemberRole
  onClose: () => void
}

function RoleIcon({ role }: { role: MemberRole }) {
  if (role === 'owner') return (
    <span title="Owner">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--warn)">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
      </svg>
    </span>
  )
  if (role === 'admin') return (
    <span title="Admin">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--primary)">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
    </span>
  )
  return null
}

export function MembersPanel({ roomId, myUserId, myRole, onClose }: Props) {
  const { data: members = [] } = useRoomMembers(roomId)
  const setRole = useSetMemberRole()
  const kick = useKickMember()

  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <aside
      className="flex h-full w-56 shrink-0 flex-col"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      <div
        className="flex h-12 items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
          Members — {members.length}
        </span>
        <button
          onClick={onClose}
          style={{ color: 'var(--text2)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text2)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {members.map((m) => {
          const isMe = m.user_id === myUserId
          const canAct = canManage && !isMe && !(myRole === 'admin' && m.role !== 'member')
          return (
            <div
              key={m.user_id}
              className="group flex items-center gap-2 px-3 py-1.5 rounded mx-1"
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white select-none"
                style={{ background: 'var(--primary)' }}
              >
                {m.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm" style={{ color: 'var(--text)' }}>{m.username}</span>
                  <RoleIcon role={m.role} />
                </div>
              </div>
              {canAct && (
                <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100">
                  {myRole === 'owner' && m.role === 'member' && (
                    <button
                      onClick={() => setRole.mutate({ roomId, userId: m.user_id, role: 'admin' })}
                      title="Promote to admin"
                      className="rounded p-0.5"
                      style={{ color: 'var(--text2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = '' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      </svg>
                    </button>
                  )}
                  {myRole === 'owner' && m.role === 'admin' && (
                    <button
                      onClick={() => setRole.mutate({ roomId, userId: m.user_id, role: 'member' })}
                      title="Demote to member"
                      className="rounded p-0.5"
                      style={{ color: 'var(--text2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 15%, transparent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = '' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4zm0 10h-4v-2h4V7l4 3-4 3v-1z"/>
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => kick.mutate({ roomId, userId: m.user_id })}
                    title="Kick member"
                    className="rounded p-0.5"
                    style={{ color: 'var(--text2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 15%, transparent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = '' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
