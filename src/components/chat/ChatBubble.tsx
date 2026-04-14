import { useState } from 'react'
import type { Message, MemberRole } from '@/types'

const USER_COLORS = ['#818cf8','#34d399','#fbbf24','#f87171','#c084fc','#38bdf8','#fb923c','#a3e635']

function getUserColor(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = userId.charCodeAt(i) + ((h << 5) - h)
  return USER_COLORS[Math.abs(h) % USER_COLORS.length]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today ${t}`
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `Yesterday ${t}`
  return `${d.toLocaleDateString()} ${t}`
}

function Avatar({ message }: { message: Message }) {
  const color = getUserColor(message.user_id)
  const label = message.display_name || message.username
  if (message.avatar_url)
    return <img src={message.avatar_url} alt={label} className="size-9 rounded-full object-cover" />
  return (
    <div className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white select-none"
      style={{ background: color }}>
      {label[0].toUpperCase()}
    </div>
  )
}

export function ChatBubble({ message, isOwn, isContinuation = false, myRole, isAdmin = false, onEdit, onDelete }: {
  message: Message; isOwn: boolean; isContinuation?: boolean
  myRole?: MemberRole; isAdmin?: boolean
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const color = getUserColor(message.user_id)
  const displayName = message.display_name || message.username
  const canEdit = isOwn && !!onEdit
  const canDelete = (isOwn || myRole === 'owner' || myRole === 'admin' || isAdmin) && !!onDelete

  const startEdit = () => { setEditValue(message.content); setEditing(true) }
  const submitEdit = () => {
    const t = editValue.trim()
    if (t && t !== message.content && onEdit) onEdit(message.id, t)
    setEditing(false)
  }

  const actions = (canEdit || canDelete) && !editing && (
    <div className="absolute right-3 top-1 hidden group-hover:flex items-center gap-0.5 rounded-lg shadow-lg z-10"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      {canEdit && (
        <button onClick={startEdit} title="Edit"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = '' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      )}
      {canDelete && (
        <button onClick={() => onDelete?.(message.id)} title="Delete"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--surface3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = '' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      )}
    </div>
  )

  const content = editing ? (
    <div className="mt-1">
      <textarea autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() } if (e.key === 'Escape') setEditing(false) }}
        rows={Math.min(editValue.split('\n').length + 1, 8)}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
        style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--primary)' }} />
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text3)' }}>Enter to save · Esc to cancel</p>
    </div>
  ) : (
    <p className="mt-0.5 text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }}>
      {message.content}
      {message.edited_at && <span className="ml-1 text-[11px]" style={{ color: 'var(--text3)' }}>(edited)</span>}
    </p>
  )

  if (isContinuation) {
    return (
      <div className="group relative flex items-start gap-3 px-4 py-0.5 rounded-lg transition-colors"
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
        onMouseLeave={(e) => e.currentTarget.style.background = ''}>
        <div className="w-9 shrink-0 flex justify-end pt-0.5">
          <span className="invisible text-[10px] group-hover:visible" style={{ color: 'var(--text3)' }}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {editing ? <div className="flex-1 min-w-0">{content}</div> : (
          <p className="flex-1 text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }}>
            {message.content}
            {message.edited_at && <span className="ml-1 text-[11px]" style={{ color: 'var(--text3)' }}>(edited)</span>}
          </p>
        )}
        {actions}
      </div>
    )
  }

  return (
    <div className="group relative flex items-start gap-3 px-4 pt-4 pb-0.5 rounded-lg transition-colors"
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
      <div className="shrink-0"><Avatar message={message} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold leading-none" style={{ color }}>{displayName}</span>
          <span className="text-[11px]" style={{ color: 'var(--text3)' }}>{formatTime(message.created_at)}</span>
        </div>
        {content}
      </div>
      {actions}
    </div>
  )
}
