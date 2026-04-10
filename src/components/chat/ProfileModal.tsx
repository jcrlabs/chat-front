import { useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/queries/use-profile'

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
      <div className="w-full max-w-sm rounded-lg bg-[#313338] shadow-xl">
        {/* Header banner */}
        <div className="h-20 rounded-t-lg bg-[#5865f2]" />

        {/* Avatar */}
        <div className="relative -mt-10 px-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="group relative inline-block"
            title="Change avatar"
          >
            <div className="size-20 overflow-hidden rounded-full ring-4 ring-[#313338]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-[#5865f2] text-2xl font-bold text-white">
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
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              placeholder={user?.username}
              className="w-full rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] placeholder-[#6d6f78] outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
            <p className="mt-1 text-xs text-[#949ba4]">
              Shown in chat instead of your username
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
              Username
            </label>
            <div className="rounded bg-[#1e1f22] px-3 py-2 text-sm text-[#6d6f78]">
              {user?.username}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded bg-[#4e505880] py-2 text-sm font-medium text-[#dbdee1] hover:bg-[#6d6f7880] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="flex-1 rounded bg-[#5865f2] py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
            >
              {saved ? 'Saved!' : updateProfile.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
