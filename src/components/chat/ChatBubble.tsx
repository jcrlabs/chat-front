import { useState } from 'react'
import type { Message, MemberRole } from '@/types'

interface ChatBubbleProps {
  message: Message
  isOwn: boolean
  isContinuation?: boolean
  myRole?: MemberRole
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
}

const USER_COLORS = [
  '#7289da', '#43b581', '#faa61a', '#ed4245', '#eb459e',
  '#5865f2', '#57f287', '#fee75c', '#3ba55d', '#ff7043',
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

function formatDiscordTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today at ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ message }: { message: Message }) {
  const color = getUserColor(message.user_id)
  const label = message.display_name || message.username
  if (message.avatar_url) {
    return (
      <img
        src={message.avatar_url}
        alt={label}
        className="size-10 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white select-none"
      style={{ backgroundColor: color }}
    >
      {label[0].toUpperCase()}
    </div>
  )
}

function ActionBar({
  canEdit,
  canDelete,
  onEditClick,
  onDeleteClick,
}: {
  canEdit: boolean
  canDelete: boolean
  onEditClick: () => void
  onDeleteClick: () => void
}) {
  if (!canEdit && !canDelete) return null
  return (
    <div className="absolute right-2 top-0.5 hidden group-hover:flex items-center gap-0.5 bg-[#2b2d31] border border-[#1e1f22] rounded shadow-lg z-10">
      {canEdit && (
        <button
          onClick={onEditClick}
          title="Edit message"
          className="p-1.5 text-[#80848e] hover:text-[#dbdee1] hover:bg-[#35373c] rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      )}
      {canDelete && (
        <button
          onClick={onDeleteClick}
          title="Delete message"
          className="p-1.5 text-[#80848e] hover:text-[#ed4245] hover:bg-[#35373c] rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export function ChatBubble({
  message,
  isOwn,
  isContinuation = false,
  myRole,
  onEdit,
  onDelete,
}: ChatBubbleProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const color = getUserColor(message.user_id)
  const displayName = message.display_name || message.username
  const canEdit = isOwn && !!onEdit
  const canDelete = (isOwn || myRole === 'owner' || myRole === 'admin') && !!onDelete

  const startEdit = () => {
    setEditValue(message.content)
    setEditing(true)
  }

  const submitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  const handleEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEdit()
    }
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  const messageContent = editing ? (
    <div className="mt-1">
      <textarea
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleEditKey}
        rows={Math.min(editValue.split('\n').length + 1, 8)}
        className="w-full rounded bg-[#383a40] px-3 py-2 text-sm text-[#dcddde] outline-none focus:ring-1 focus:ring-[#5865f2] resize-none"
      />
      <p className="mt-1 text-[11px] text-[#72767d]">
        Enter to save · Esc to cancel
      </p>
    </div>
  ) : (
    <p className="mt-1 text-sm text-[#dcddde] leading-relaxed break-words">
      {message.content}
      {message.edited_at && (
        <span className="ml-1 text-[11px] text-[#72767d]">(edited)</span>
      )}
    </p>
  )

  if (isContinuation) {
    return (
      <div className="group relative flex items-start gap-4 px-4 py-0.5 hover:bg-[#2e3035] rounded">
        <div className="w-10 shrink-0 flex justify-end">
          <span className="invisible text-[11px] text-[#80848e] group-hover:visible leading-5 mt-0.5">
            {formatShortTime(message.created_at)}
          </span>
        </div>
        {editing ? (
          <div className="flex-1 min-w-0">{messageContent}</div>
        ) : (
          <p className="flex-1 text-sm text-[#dcddde] leading-relaxed break-words">
            {message.content}
            {message.edited_at && (
              <span className="ml-1 text-[11px] text-[#72767d]">(edited)</span>
            )}
          </p>
        )}
        <ActionBar
          canEdit={canEdit}
          canDelete={canDelete}
          onEditClick={startEdit}
          onDeleteClick={() => onDelete?.(message.id)}
        />
      </div>
    )
  }

  return (
    <div className="group relative flex items-start gap-4 px-4 pt-4 pb-0.5 hover:bg-[#2e3035] rounded">
      <div className="w-10 shrink-0">
        <Avatar message={message} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm leading-none" style={{ color }}>
            {displayName}
          </span>
          <span className="text-[11px] text-[#949ba4]">{formatDiscordTime(message.created_at)}</span>
        </div>
        {messageContent}
      </div>
      <ActionBar
        canEdit={canEdit}
        canDelete={canDelete}
        onEditClick={startEdit}
        onDeleteClick={() => onDelete?.(message.id)}
      />
    </div>
  )
}
