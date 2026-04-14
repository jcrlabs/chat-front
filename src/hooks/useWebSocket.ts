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
  // Each connect() call gets a generation number. The cleanup increments it,
  // invalidating any in-flight onclose/onopen callbacks from the old connection.
  const generationRef = useRef(0)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled || !url) return

    const myGen = ++generationRef.current
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (generationRef.current !== myGen) return
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
      // If generation changed, a newer connection already took over — ignore.
      if (generationRef.current !== myGen) return
      setConnected(false)
      wsRef.current = null
      const delay = reconnectDelay.current
      reconnectDelay.current = Math.min(delay * 2, 30_000)
      setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [url, enabled])

  useEffect(() => {
    connect()
    return () => {
      // Bump generation to invalidate callbacks from the current WS.
      generationRef.current++
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [connect])

  const send = useCallback((msg: WSClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { connected, send }
}
