import { api } from './client'
import type { Message } from '@/types'

export const messagesApi = {
  history: (roomId: string, cursor?: string, limit = 50) =>
    api
      .get<Message[]>(`/rooms/${roomId}/messages`, {
        params: { cursor, limit },
      })
      .then((r) => r.data),
}
