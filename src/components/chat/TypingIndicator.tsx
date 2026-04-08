interface Props {
  usernames: string[]
}

export function TypingIndicator({ usernames }: Props) {
  if (usernames.length === 0) return null

  const label =
    usernames.length === 1
      ? `${usernames[0]} is typing…`
      : `${usernames.slice(0, 2).join(', ')} are typing…`

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-400">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      {label}
    </div>
  )
}
