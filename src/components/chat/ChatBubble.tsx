import { cn, formatTime } from '@/lib/utils'
import type { Message } from '@/types'

interface ChatBubbleProps {
  message: Message
  isOwn: boolean
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <div className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          isOwn ? 'bg-indigo-600' : 'bg-gray-600',
        )}
      >
        {message.username[0].toUpperCase()}
      </div>
      <div className={cn('max-w-xs lg:max-w-md', isOwn && 'items-end')}>
        {!isOwn && (
          <p className="mb-0.5 text-xs text-gray-400">{message.username}</p>
        )}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            isOwn
              ? 'rounded-br-sm bg-indigo-600 text-white'
              : 'rounded-bl-sm bg-gray-700 text-gray-100',
          )}
        >
          {message.content}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{formatTime(message.created_at)}</p>
      </div>
    </div>
  )
}
