import { useInfiniteQuery } from '@tanstack/react-query'
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
