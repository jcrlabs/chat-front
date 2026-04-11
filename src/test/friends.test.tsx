import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddFriendModal } from '@/components/chat/AddFriendModal'

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/queries/use-friends', () => ({
  useSearchUsers: vi.fn((q: string) => ({
    data: q === 'alice#0042'
      ? [{ id: 'user-1', username: 'alice', tag: '0042', displayName: 'Alice', created_at: '' }]
      : q.includes('#') && q.split('#')[1]?.length > 0
        ? []
        : undefined,
  })),
  useSendFriendRequest: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isSuccess: false })),
  useFriendRequests: vi.fn(() => ({
    data: [
      {
        friendship_id: 'req-1',
        from: { id: 'user-2', username: 'bob', tag: '1234', displayName: 'Bob', created_at: '' },
        created_at: '',
      },
    ],
  })),
  useAcceptFriendRequest: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveFriend: vi.fn(() => ({ mutate: vi.fn() })),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AddFriendModal onClose={onClose} />
    </QueryClientProvider>
  )
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AddFriendModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders format hint', () => {
    renderModal()
    expect(screen.getByText(/username#0000/i)).toBeInTheDocument()
  })

  it('shows validation error when input has no #', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('alice#0042'), {
      target: { value: 'alice' },
    })
    expect(screen.getByText(/include the # and tag/i)).toBeInTheDocument()
  })

  it('shows validation error when tag part is empty', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('alice#0042'), {
      target: { value: 'alice#' },
    })
    expect(screen.getByText(/include the # and tag/i)).toBeInTheDocument()
  })

  it('shows no validation error for valid tag format', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('alice#0042'), {
      target: { value: 'alice#0042' },
    })
    expect(screen.queryByText(/include the # and tag/i)).not.toBeInTheDocument()
  })

  it('displays found user with tag', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('alice#0042'), {
      target: { value: 'alice#0042' },
    })
    await waitFor(() => {
      expect(screen.getByText('alice#0042')).toBeInTheDocument()
    })
  })

  it('shows "no user found" for valid format with no results', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('alice#0042'), {
      target: { value: 'ghost#9999' },
    })
    await waitFor(() => {
      expect(screen.getByText(/no user found/i)).toBeInTheDocument()
    })
  })

  it('shows pending requests with tag', () => {
    renderModal()
    expect(screen.getByText('bob#1234')).toBeInTheDocument()
    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Decline')).toBeInTheDocument()
  })

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn()
    renderModal(onClose)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    const { container } = renderModal(onClose)
    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when modal content clicked', () => {
    const onClose = vi.fn()
    renderModal(onClose)
    fireEvent.click(screen.getByText('Add Friend'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ── tag format unit tests ─────────────────────────────────────────────────────

describe('tag format validation', () => {
  const isValidTagQuery = (q: string) =>
    q.includes('#') && q.split('#')[1]?.length > 0

  it('accepts valid tag queries', () => {
    expect(isValidTagQuery('alice#0042')).toBe(true)
    expect(isValidTagQuery('x#1')).toBe(true)
    expect(isValidTagQuery('Bob#9999')).toBe(true)
  })

  it('rejects queries without #', () => {
    expect(isValidTagQuery('alice')).toBe(false)
    expect(isValidTagQuery('')).toBe(false)
  })

  it('rejects queries with empty tag part', () => {
    expect(isValidTagQuery('alice#')).toBe(false)
  })
})
