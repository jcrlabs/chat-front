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
