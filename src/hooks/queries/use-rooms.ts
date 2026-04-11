import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '@/api/rooms'
import type { RoomType } from '@/types'

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: roomsApi.list })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type?: RoomType }) => roomsApi.create(name, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useMyInvites() {
  return useQuery({ queryKey: ['invites', 'me'], queryFn: roomsApi.myInvites })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsApi.inviteUser(roomId, userId),
    onSuccess: (_data, { roomId }) =>
      qc.invalidateQueries({ queryKey: ['invites', 'room', roomId] }),
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => roomsApi.acceptInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites', 'me'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useDeclineInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => roomsApi.declineInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', 'me'] }),
  })
}

export function useRoomMembers(roomId: string | null) {
  return useQuery({
    queryKey: ['members', roomId],
    queryFn: () => roomsApi.members(roomId!),
    enabled: !!roomId,
  })
}

export function useSetMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, userId, role }: { roomId: string; userId: string; role: string }) =>
      roomsApi.setMemberRole(roomId, userId, role),
    onSuccess: (_d, { roomId }) => qc.invalidateQueries({ queryKey: ['members', roomId] }),
  })
}

export function useKickMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsApi.kickMember(roomId, userId),
    onSuccess: (_d, { roomId }) => qc.invalidateQueries({ queryKey: ['members', roomId] }),
  })
}
