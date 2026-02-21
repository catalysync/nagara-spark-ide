import { useCallback, useEffect, useRef, useState } from 'react'

type MessageHandler = (data: any) => void

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map())

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 2s
      setTimeout(connect, 2000)
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const handler = handlersRef.current.get(data.type)
      if (handler) handler(data)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const on = useCallback((type: string, handler: MessageHandler) => {
    handlersRef.current.set(type, handler)
  }, [])

  return { connected, send, on }
}
