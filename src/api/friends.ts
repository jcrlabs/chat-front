import { api } from './client'
import type { FriendEntry, FriendRequest, DMRoom, Room, User } from '@/types'

export const searchUsers = (q: string) =>
  api.get<User[]>('/users/search', { params: { q } }).then((r) => r.data)

export const sendFriendRequest = (addressee_id: string) =>
  api.post('/friends/request', { addressee_id })

export const listFriendRequests = () =>
  api.get<FriendRequest[]>('/friends/requests').then((r) => r.data)

export const acceptFriendRequest = (id: string) =>
  api.post(`/friends/accept/${id}`)

export const removeFriend = (id: string) =>
  api.delete(`/friends/${id}`)

export const listFriends = () =>
  api.get<FriendEntry[]>('/friends').then((r) => r.data)

export const createDM = (user_id: string) =>
  api.post<Room>('/dms', { user_id }).then((r) => r.data)

export const listDMs = () =>
  api.get<DMRoom[]>('/dms').then((r) => r.data)
