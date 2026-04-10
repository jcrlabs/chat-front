import type { Message } from '@/types'

interface ChatBubbleProps {
  message: Message
  isOwn: boolean
  isContinuation?: boolean
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

export function ChatBubble({ message, isContinuation = false }: ChatBubbleProps) {
  const color = getUserColor(message.user_id)
  const displayName = message.display_name || message.username

  if (isContinuation) {
    return (
      <div className="group flex items-start gap-4 px-4 py-0.5 hover:bg-[#2e3035] rounded">
        <div className="w-10 shrink-0 flex justify-end">
          <span className="invisible text-[11px] text-[#80848e] group-hover:visible leading-5 mt-0.5">
            {formatShortTime(message.created_at)}
          </span>
        </div>
        <p className="flex-1 text-sm text-[#dcddde] leading-relaxed break-words">{message.content}</p>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-4 px-4 pt-4 pb-0.5 hover:bg-[#2e3035] rounded">
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
        <p className="mt-1 text-sm text-[#dcddde] leading-relaxed break-words">{message.content}</p>
      </div>
    </div>
  )
}
