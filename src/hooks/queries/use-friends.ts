import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as friendsApi from '@/api/friends'

export const useFriends = () =>
  useQuery({ queryKey: ['friends'], queryFn: friendsApi.listFriends })

export const useFriendRequests = () =>
  useQuery({ queryKey: ['friend-requests'], queryFn: friendsApi.listFriendRequests })

export const useDMs = () =>
  useQuery({ queryKey: ['dms'], queryFn: friendsApi.listDMs })

export const useSearchUsers = (q: string) =>
  useQuery({
    queryKey: ['users-search', q],
    queryFn: () => friendsApi.searchUsers(q),
    enabled: q.includes('#') && q.split('#')[1]?.length > 0,
  })

export const useSendFriendRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addresseeId: string) => friendsApi.sendFriendRequest(addresseeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export const useAcceptFriendRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.acceptFriendRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
    },
  })
}

export const useRemoveFriend = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.removeFriend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export const useCreateDM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => friendsApi.createDM(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dms'] }),
  })
}
