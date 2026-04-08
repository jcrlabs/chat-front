import { type FormEvent, useRef, useState } from 'react'

interface Props {
  onSend: (content: string) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
}

export function MessageInput({ onSend, onTyping, disabled }: Props) {
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
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-700 p-4">
      <input
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Type a message…"
        className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  )
}
