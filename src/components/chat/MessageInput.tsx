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
    if (!isTyping.current) { isTyping.current = true; onTyping(true) }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { isTyping.current = false; onTyping(false) }, 2000)
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

  const canSend = !disabled && !!value.trim()

  return (
    <form onSubmit={handleSubmit} className="shrink-0 px-4 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all"
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          outline: 'none',
        }}>
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e as unknown as FormEvent)}
          disabled={disabled}
          placeholder={disabled ? 'Connecting…' : channelName ? `Message #${channelName}` : 'Type a message…'}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text)', caretColor: 'var(--primary)' }}
        />
        <button type="submit" disabled={!canSend}
          className="shrink-0 flex size-7 items-center justify-center rounded-lg transition-all"
          style={{
            background: canSend ? 'var(--primary)' : 'transparent',
            color: canSend ? 'white' : 'var(--text3)',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </form>
  )
}
