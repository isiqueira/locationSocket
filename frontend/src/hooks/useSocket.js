import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

/**
 * useSocket — conecta ao Socket.IO e retorna a instância.
 * @param {object} opts  – opções passadas ao io()
 * @param {boolean} enabled – conecta apenas quando true (default: true)
 */
export function useSocket(opts = {}, enabled = true) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    const token = localStorage.getItem('token')
    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      ...opts,
    })
    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return socketRef
}
