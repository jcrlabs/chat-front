import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/api/messages'

export function useMessages(roomId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: ({ pageParam }) => messagesApi.history(roomId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].id // cursor = oldest message id
    },
    enabled: !!roomId,
  })
}

export function useEditMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string; roomId: string }) =>
      messagesApi.edit(messageId, content),
    onSuccess: (_data, { roomId }) => qc.invalidateQueries({ queryKey: ['messages', roomId] }),
  })
}

export function useDeleteMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; roomId: string }) =>
      messagesApi.delete(messageId),
    onSuccess: (_data, { roomId }) => qc.invalidateQueries({ queryKey: ['messages', roomId] }),
  })
}
