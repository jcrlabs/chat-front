import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface AdminUser { id: string; username: string; email: string; tag: string; display_name?: string; is_admin: boolean; created_at: string }
interface AdminRoom { id: string; name: string; type: string; owner_username: string; created_at: string; member_count: number }

export function AdminPage() {
  const [tab, setTab] = useState<'users' | 'rooms'>('users')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const qc = useQueryClient()

  const { data: users = [] } = useQuery<AdminUser[]>({ queryKey: ['admin-users'], queryFn: () => api.get('/admin/users').then(r => r.data) })
  const { data: rooms = [] } = useQuery<AdminRoom[]>({ queryKey: ['admin-rooms'], queryFn: () => api.get('/admin/rooms').then(r => r.data) })

  const deleteUser = useMutation({ mutationFn: (id: string) => api.delete(`/admin/users/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) })
  const deleteRoom = useMutation({ mutationFn: (id: string) => api.delete(`/admin/rooms/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rooms'] }) })
  const renameRoom = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/admin/rooms/${id}`, { name }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-rooms'] }); setRenamingId(null) } })
  const toggleAdmin = useMutation({ mutationFn: ({ id, is_admin }: { id: string; is_admin: boolean }) => api.patch(`/admin/users/${id}/admin`, { is_admin }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) })

  const confirm = (msg: string, fn: () => void) => { if (window.confirm(msg)) fn() }

  const startRename = (room: AdminRoom) => { setRenamingId(room.id); setRenameValue(room.name) }
  const submitRename = (id: string) => { const n = renameValue.trim(); if (n) renameRoom.mutate({ id, name: n }); else setRenamingId(null) }

  return (
    <div className="min-h-screen bg-[#313338] text-[#dcddde]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#f2f3f5]">Admin Panel</h1>
          <span className="rounded bg-[#f04747] px-2 py-0.5 text-xs font-bold text-white">ADMIN</span>
          <a href="/" className="ml-auto text-sm text-[#5865f2] hover:underline">← Back to chat</a>
        </div>

        <div className="mb-4 flex gap-2">
          {(['users', 'rooms'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-[#5865f2] text-white' : 'bg-[#2b2d31] text-[#949ba4] hover:text-[#dbdee1]'}`}>
              {t} ({t === 'users' ? users.length : rooms.length})
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="overflow-hidden rounded-lg bg-[#2b2d31]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1e1f22] text-xs uppercase text-[#949ba4]">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Tag</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>{users.map(u => (
                <tr key={u.id} className="border-b border-[#1e1f22] hover:bg-[#35373c]">
                  <td className="px-4 py-3 font-medium text-[#f2f3f5]">{u.display_name || u.username}</td>
                  <td className="px-4 py-3 text-[#949ba4]">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#949ba4]">#{u.tag}</td>
                  <td className="px-4 py-3">{u.is_admin && <span className="rounded bg-[#f04747] px-1.5 py-0.5 text-[10px] font-bold text-white">ADMIN</span>}</td>
                  <td className="px-4 py-3 text-[#949ba4]">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => confirm(`${u.is_admin ? 'Revoke' : 'Grant'} admin for ${u.username}?`, () => toggleAdmin.mutate({ id: u.id, is_admin: !u.is_admin }))}
                        className={`rounded px-2 py-1 text-xs transition-colors ${u.is_admin ? 'text-[#faa61a] hover:bg-[#faa61a20]' : 'text-[#3ba55d] hover:bg-[#3ba55d20]'}`}>
                        {u.is_admin ? 'Revoke admin' : 'Make admin'}
                      </button>
                      {!u.is_admin && <button onClick={() => confirm(`Delete user ${u.username}?`, () => deleteUser.mutate(u.id))}
                        className="rounded px-2 py-1 text-xs text-[#f04747] hover:bg-[#f0474720] transition-colors">Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'rooms' && (
          <div className="overflow-hidden rounded-lg bg-[#2b2d31]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1e1f22] text-xs uppercase text-[#949ba4]">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Members</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>{rooms.map(r => (
                <tr key={r.id} className="border-b border-[#1e1f22] hover:bg-[#35373c]">
                  <td className="px-4 py-3 font-medium text-[#f2f3f5]">
                    {renamingId === r.id ? (
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(r.id); if (e.key === 'Escape') setRenamingId(null) }}
                        onBlur={() => submitRename(r.id)}
                        className="rounded bg-[#1e1f22] px-2 py-0.5 text-sm text-[#dbdee1] outline-none focus:ring-1 focus:ring-[#5865f2] w-40" />
                    ) : r.name}
                  </td>
                  <td className="px-4 py-3"><span className="rounded bg-[#35373c] px-1.5 py-0.5 text-[10px] font-mono text-[#949ba4]">{r.type}</span></td>
                  <td className="px-4 py-3 text-[#949ba4]">{r.owner_username}</td>
                  <td className="px-4 py-3 text-[#949ba4]">{r.member_count}</td>
                  <td className="px-4 py-3 text-[#949ba4]">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {renamingId !== r.id && <button onClick={() => startRename(r)} className="rounded px-2 py-1 text-xs text-[#949ba4] hover:bg-[#35373c] transition-colors">Rename</button>}
                      <button onClick={() => confirm(`Delete room #${r.name}?`, () => deleteRoom.mutate(r.id))}
                        className="rounded px-2 py-1 text-xs text-[#f04747] hover:bg-[#f0474720] transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
