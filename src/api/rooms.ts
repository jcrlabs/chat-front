import { api } from './client'
import type { Room, Member, RoomType } from '@/types'

export const roomsApi = {
  list: () => api.get<Room[]>('/rooms').then((r) => r.data),
  create: (name: string, type: RoomType = 'public') =>
    api.post<Room>('/rooms', { name, type }).then((r) => r.data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
  members: (id: string) => api.get<Member[]>(`/rooms/${id}/members`).then((r) => r.data),
}
