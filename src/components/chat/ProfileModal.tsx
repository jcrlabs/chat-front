import { useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/queries/use-profile'

function CopyTag({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title="Copy tag"
      className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors"
      style={{ color: 'var(--primary)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 12%, transparent)'}
      onMouseLeave={(e) => e.currentTarget.style.background = ''}
    >
      {copied ? (
        'Copied!'
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

interface Props {
  onClose: () => void
}

export function ProfileModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? user?.displayName ?? '')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = user?.avatarUrl ?? (profile?.has_avatar ? `/api/users/${user?.id}/avatar` : null)
  const initial = (user?.displayName || user?.username || '?')[0].toUpperCase()

  const handleSave = async () => {
    await updateProfile.mutateAsync(displayName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadAvatar.mutate(file)
    e.target.value = ''
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-lg shadow-xl"
        style={{ background: 'var(--surface2)' }}
      >
        {/* Header banner */}
        <div className="h-20 rounded-t-lg" style={{ background: 'var(--primary)' }} />

        {/* Avatar */}
        <div className="relative -mt-10 px-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="group relative inline-block"
            title="Change avatar"
          >
            <div
              className="size-20 overflow-hidden rounded-full ring-4"
              style={{ ringColor: 'var(--surface2)' } as React.CSSProperties}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <div
                  className="flex size-full items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  {initial}
                </div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-semibold text-white">
                {uploadAvatar.isPending ? '…' : 'CHANGE'}
              </span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Fields */}
        <div className="space-y-4 p-4 pt-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              placeholder={user?.username}
              className="w-full rounded px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text2)' }}>
              Shown in chat instead of your username
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
              Username &amp; Tag
            </label>
            <div
              className="flex items-center rounded px-3 py-2 text-sm"
              style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)' }}
            >
              <span>
                {user?.username}
                {profile?.tag && (
                  <span style={{ color: 'var(--primary)' }}>#{profile.tag}</span>
                )}
              </span>
              {profile?.tag && (
                <CopyTag value={`${user?.username}#${profile.tag}`} />
              )}
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text2)' }}>Share this tag so others can find you</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded py-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--surface3)', color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface3)'}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="flex-1 rounded py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={(e) => !updateProfile.isPending && (e.currentTarget.style.background = 'var(--primary-h)')}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
            >
              {saved ? 'Saved!' : updateProfile.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
