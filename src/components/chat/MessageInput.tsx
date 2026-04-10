import { type FormEvent, useRef, useState } from 'react'

interface Props {
  onSend: (content: string) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
  channelName?: string
}

export function MessageInput({ onSend, onTyping, disabled, channelName }: Props) {
  const [value, setValue] = useState('')
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTyping = useRef(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    if (!isTyping.current) {
      isTyping.current = true
      onTyping(true)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      isTyping.current = false
      onTyping(false)
    }, 2000)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    if (typingTimer.current) clearTimeout(typingTimer.current)
    isTyping.current = false
    onTyping(false)
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 px-4 pb-6">
      <div className="flex items-center gap-3 rounded-lg bg-[#383a40] px-4 py-3">
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e as unknown as FormEvent)}
          disabled={disabled}
          placeholder={channelName ? `Message #${channelName}` : 'Type a message…'}
          className="flex-1 bg-transparent text-sm text-[#dcddde] placeholder-[#6d6f78] outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 text-[#949ba4] hover:text-[#dbdee1] disabled:opacity-30 transition-colors"
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </form>
  )
}
