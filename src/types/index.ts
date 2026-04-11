export interface User {
  id: string
  username: string
  tag: string
  displayName?: string
  avatarUrl?: string
  email?: string
  created_at: string
}

export type RoomType = 'public' | 'private' | 'dm' | 'voice'

export interface Room {
  id: string
  name: string
  type: RoomType
  owner_id: string
  created_at: string
}

export type MemberRole = 'owner' | 'admin' | 'member'

export interface Member {
  user_id: string
  username: string
  role: MemberRole
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

export type InviteStatus = 'pending' | 'accepted' | 'declined'

export interface RoomInvite {
  id: string
  room_id: string
  inviter_id: string
  invitee_id: string
  status: InviteStatus
  created_at: string
  room_name?: string
  inviter_username?: string
  invitee_username?: string
}

// WebSocket protocol — must stay in sync with backend ws/protocol.go
export type WSClientMessageType = 'join_room' | 'leave_room' | 'chat_message' | 'typing'
export type WSServerMessageType = 'chat_message' | 'typing' | 'presence' | 'room_joined' | 'error' | 'voice_joined' | 'voice_left' | 'voice_offer' | 'voice_answer' | 'ice_candidate' | 'voice_participants'

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
  // Voice
  sdp?: string
  sdp_type?: string
  candidate?: string
  sdp_mid?: string
  sdp_m_line_index?: number
  participants?: string[]
}
