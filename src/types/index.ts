export interface User {
  id: string
  username: string
  tag: string
  displayName?: string
  avatarUrl?: string
  email?: string
  created_at: string
}

export type RoomType = 'public' | 'private' | 'dm'

export interface Room {
  id: string
  name: string
  type: RoomType
  owner_id: string
  created_at: string
}

export interface Member {
  user_id: string
  username: string
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  username: string
  display_name?: string
  avatar_url?: string
  content: string
  created_at: string
}

export interface FriendEntry {
  friendship_id: string
  user: User
}

export interface FriendRequest {
  friendship_id: string
  from: User
  created_at: string
}

export interface DMRoom {
  id: string
  other_user: {
    id: string
    username: string
    display_name?: string
    has_avatar: boolean
  }
  created_at: string
}

// WebSocket protocol — must stay in sync with backend ws/protocol.go
export type WSClientMessageType = 'join_room' | 'leave_room' | 'chat_message' | 'typing'
export type WSServerMessageType = 'chat_message' | 'typing' | 'presence' | 'room_joined' | 'error'

export interface WSClientMessage {
  type: WSClientMessageType
  room_id: string
  content?: string
  is_typing?: boolean
}

export interface WSServerMessage {
  type: WSServerMessageType
  room_id?: string
  user_id?: string
  username?: string
  display_name?: string
  avatar_url?: string
  content?: string
  timestamp?: string
  status?: 'online' | 'offline'
  members?: Member[]
  error?: { code: string; message: string }
}
