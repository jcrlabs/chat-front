import { useCallback, useEffect, useRef, useState } from 'react'
import type { WSClientMessage, WSServerMessage } from '@/types'

interface UseWebSocketOptions {
  onMessage: (msg: WSServerMessage) => void
  enabled?: boolean
}

export function useWebSocket(url: string, { onMessage, enabled = true }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(1000)
  const onMessageRef = useRef(onMessage)
  // Tracks whether the current effect instance is still active.
  // Prevents stale closures in ws.onclose from scheduling reconnects
  // after the url/enabled changed (e.g. token refreshed, logout).
  const activeRef = useRef(false)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled || !url) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectDelay.current = 1000
    }

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as WSServerMessage
        onMessageRef.current(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      if (!activeRef.current) return
      const delay = reconnectDelay.current
      reconnectDelay.current = Math.min(delay * 2, 30_000)
      setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [url, enabled])

  useEffect(() => {
    activeRef.current = true
    connect()
    return () => {
      activeRef.current = false
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: WSClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { connected, send }
}
