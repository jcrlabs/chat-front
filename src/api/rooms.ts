import { api } from './client'
import type { Room, Member, RoomType, RoomInvite } from '@/types'

export const roomsApi = {
  list: () => api.get<Room[]>('/rooms').then((r) => r.data),
  create: (name: string, type: RoomType = 'public') =>
    api.post<Room>('/rooms', { name, type }).then((r) => r.data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
  members: (id: string) => api.get<Member[]>(`/rooms/${id}/members`).then((r) => r.data),
  inviteUser: (roomId: string, userId: string) =>
    api.post<RoomInvite>(`/rooms/${roomId}/invites`, { user_id: userId }).then((r) => r.data),
  listRoomInvites: (roomId: string) =>
    api.get<RoomInvite[]>(`/rooms/${roomId}/invites`).then((r) => r.data),
  acceptInvite: (inviteId: string) => api.post(`/invites/${inviteId}/accept`),
  declineInvite: (inviteId: string) => api.post(`/invites/${inviteId}/decline`),
  myInvites: () => api.get<RoomInvite[]>('/me/invites').then((r) => r.data),
  setMemberRole: (roomId: string, userId: string, role: string) =>
    api.put(`/rooms/${roomId}/members/${userId}/role`, { role }),
  kickMember: (roomId: string, userId: string) =>
    api.delete(`/rooms/${roomId}/members/${userId}`),
  rename: (id: string, name: string) =>
    api.patch<Room>(`/rooms/${id}`, { name }).then((r) => r.data),
}
