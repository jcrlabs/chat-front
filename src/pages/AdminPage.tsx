import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface AdminUser {
  id: string
  username: string
  email: string
  tag: string
  display_name?: string
  is_admin: boolean
  created_at: string
}
interface AdminRoom {
  id: string
  name: string
  type: string
  owner_username: string
  created_at: string
  member_count: number
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-[#f04747]/30 bg-[#f04747]/10 px-4 py-3 text-sm text-[#f04747]">
      <strong>Error:</strong> {message}
    </div>
  )
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-[#1e1f22]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 w-full animate-pulse rounded bg-[#35373c]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const toggleAdmin = useMutation({
    mutationFn: ({ id, is_admin }: { id: string; is_admin: boolean }) =>
      api.patch(`/admin/users/${id}/admin`, { is_admin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const confirm = (msg: string, fn: () => void) => {
    if (window.confirm(msg)) fn()
  }

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : users

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario, email..."
          className="w-64 rounded bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] placeholder-[#4e5058] outline-none focus:ring-1 focus:ring-[#5865f2]"
        />
        <span className="text-xs text-[#949ba4]">
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => refetch()}
          className="ml-auto rounded px-3 py-1.5 text-xs text-[#949ba4] hover:bg-[#35373c] transition-colors"
        >
          Actualizar
        </button>
      </div>

      {isError && (
        <ErrorBanner
          message={
            (error as { response?: { data?: { error?: string } }; message?: string })
              ?.response?.data?.error ??
            (error as { message?: string })?.message ??
            'No se pudieron cargar los usuarios'
          }
        />
      )}

      <div className="overflow-hidden rounded-lg bg-[#2b2d31]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1f22] text-xs uppercase text-[#949ba4]">
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Tag</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Registro</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows cols={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#949ba4]">
                  {search ? 'Sin resultados' : 'No hay usuarios'}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#1e1f22] hover:bg-[#35373c] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                        {(u.display_name ?? u.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[#f2f3f5]">{u.display_name ?? u.username}</div>
                        {u.display_name && (
                          <div className="text-xs text-[#949ba4]">@{u.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#949ba4]">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#949ba4]">#{u.tag}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="rounded bg-[#f04747] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-xs text-[#949ba4]">Usuario</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#949ba4]">
                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        disabled={toggleAdmin.isPending}
                        onClick={() =>
                          confirm(
                            `${u.is_admin ? 'Revocar admin de' : 'Promover a admin'} ${u.username}?`,
                            () => toggleAdmin.mutate({ id: u.id, is_admin: !u.is_admin }),
                          )
                        }
                        className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                          u.is_admin
                            ? 'text-[#faa61a] hover:bg-[#faa61a20]'
                            : 'text-[#3ba55d] hover:bg-[#3ba55d20]'
                        }`}
                      >
                        {u.is_admin ? 'Revocar admin' : 'Hacer admin'}
                      </button>
                      {!u.is_admin && (
                        <button
                          disabled={deleteUser.isPending}
                          onClick={() =>
                            confirm(
                              `Eliminar usuario ${u.username}? Esta acción no se puede deshacer.`,
                              () => deleteUser.mutate(u.id),
                            )
                          }
                          className="rounded px-2 py-1 text-xs text-[#f04747] hover:bg-[#f0474720] transition-colors disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoomsTab() {
  const qc = useQueryClient()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [search, setSearch] = useState('')

  const {
    data: rooms = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminRoom[]>({
    queryKey: ['admin-rooms'],
    queryFn: () => api.get('/admin/rooms').then((r) => r.data),
  })

  const deleteRoom = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rooms'] }),
  })

  const renameRoom = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/admin/rooms/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rooms'] })
      setRenamingId(null)
    },
  })

  const confirm = (msg: string, fn: () => void) => {
    if (window.confirm(msg)) fn()
  }

  const startRename = (room: AdminRoom) => {
    setRenamingId(room.id)
    setRenameValue(room.name)
  }

  const submitRename = (id: string) => {
    const n = renameValue.trim()
    if (n) renameRoom.mutate({ id, name: n })
    else setRenamingId(null)
  }

  const typeColors: Record<string, string> = {
    public: 'text-[#3ba55d] bg-[#3ba55d20]',
    private: 'text-[#faa61a] bg-[#faa61a20]',
    dm: 'text-[#5865f2] bg-[#5865f220]',
    voice: 'text-[#949ba4] bg-[#35373c]',
  }

  const filtered = search.trim()
    ? rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.owner_username.toLowerCase().includes(search.toLowerCase()),
      )
    : rooms

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, owner..."
          className="w-64 rounded bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] placeholder-[#4e5058] outline-none focus:ring-1 focus:ring-[#5865f2]"
        />
        <span className="text-xs text-[#949ba4]">
          {filtered.length} sala{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => refetch()}
          className="ml-auto rounded px-3 py-1.5 text-xs text-[#949ba4] hover:bg-[#35373c] transition-colors"
        >
          Actualizar
        </button>
      </div>

      {isError && (
        <ErrorBanner
          message={
            (error as { response?: { data?: { error?: string } }; message?: string })
              ?.response?.data?.error ??
            (error as { message?: string })?.message ??
            'No se pudieron cargar las salas'
          }
        />
      )}

      <div className="overflow-hidden rounded-lg bg-[#2b2d31]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1f22] text-xs uppercase text-[#949ba4]">
              <th className="px-4 py-3 text-left">Sala</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Miembros</th>
              <th className="px-4 py-3 text-left">Creada</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows cols={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#949ba4]">
                  {search ? 'Sin resultados' : 'No hay salas'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-[#1e1f22] hover:bg-[#35373c] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#f2f3f5]">
                    {renamingId === r.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(r.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onBlur={() => submitRename(r.id)}
                        className="rounded bg-[#1e1f22] px-2 py-0.5 text-sm text-[#dbdee1] outline-none focus:ring-1 focus:ring-[#5865f2] w-40"
                      />
                    ) : (
                      <span># {r.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${typeColors[r.type] ?? 'text-[#949ba4] bg-[#35373c]'}`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#949ba4]">{r.owner_username}</td>
                  <td className="px-4 py-3 text-[#949ba4]">{r.member_count}</td>
                  <td className="px-4 py-3 text-xs text-[#949ba4]">
                    {new Date(r.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {renamingId !== r.id && (
                        <button
                          onClick={() => startRename(r)}
                          className="rounded px-2 py-1 text-xs text-[#949ba4] hover:bg-[#35373c] transition-colors"
                        >
                          Renombrar
                        </button>
                      )}
                      <button
                        disabled={deleteRoom.isPending}
                        onClick={() =>
                          confirm(
                            `Eliminar sala #${r.name}? Se borrarán todos los mensajes.`,
                            () => deleteRoom.mutate(r.id),
                          )
                        }
                        className="rounded px-2 py-1 text-xs text-[#f04747] hover:bg-[#f0474720] transition-colors disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<'users' | 'rooms'>('users')

  return (
    <div className="min-h-screen bg-[#313338] text-[#dcddde]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#f2f3f5]">Panel de Administración</h1>
          <span className="rounded bg-[#f04747] px-2 py-0.5 text-xs font-bold text-white">ADMIN</span>
          <a href="/" className="ml-auto text-sm text-[#5865f2] hover:underline">
            ← Volver al chat
          </a>
        </div>

        <div className="mb-4 flex gap-2 border-b border-[#1e1f22] pb-4">
          {(['users', 'rooms'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-[#5865f2] text-white'
                  : 'bg-[#2b2d31] text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              {t === 'users' ? 'Usuarios' : 'Salas'}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'rooms' && <RoomsTab />}
      </div>
    </div>
  )
}
