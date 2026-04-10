import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/auth.store'

export function useProfile() {
  return useQuery({
    queryKey: ['me'],
    queryFn: usersApi.getMe,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (displayName: string) => usersApi.updateProfile(displayName),
    onSuccess: (profile) => {
      qc.setQueryData(['me'], profile)
      updateUser({
        displayName: profile.display_name,
        avatarUrl: profile.has_avatar
          ? `/api/users/${profile.id}/avatar?t=${Date.now()}`
          : undefined,
      })
    },
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      updateUser({ avatarUrl: `${data.avatar_url}?t=${Date.now()}` })
    },
  })
}
