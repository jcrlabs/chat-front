import { api } from './client'

export interface UserProfile {
  id: string
  username: string
  display_name?: string
  has_avatar: boolean
  email?: string
  created_at: string
  updated_at: string
}

export const usersApi = {
  getMe: () =>
    api.get<UserProfile>('/me').then((r) => r.data),

  updateProfile: (displayName: string) =>
    api.put<UserProfile>('/me', { display_name: displayName }).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api
      .post<{ avatar_url: string }>('/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
