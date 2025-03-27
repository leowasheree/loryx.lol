"use client"

import { useEffect, useRef, useState } from "react"
import type { Message } from "@/lib/types"

export function useWebSocket(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Reset messages and processed IDs when changing channels
    setMessages([])
    processedMessageIds.current.clear()

    if (!channelId) {
      console.log("No channel ID provided for WebSocket")
      setIsConnected(false)
      return
    }

    // Check for invalid channel ID
    if (channelId === "undefined") {
      console.error("Invalid channel ID: undefined")
      setError("Invalid channel ID")
      setIsConnected(false)
      return
    }

    // Try to get token from multiple sources
    const getToken = () => {
      // Try localStorage first
      const tokenFromStorage = localStorage.getItem("token")
      if (tokenFromStorage) {
        return tokenFromStorage
      }

      // Then try cookies
      const tokenFromCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1]

      if (tokenFromCookie) {
        return decodeURIComponent(tokenFromCookie)
      }

      return null
    }

    const token = getToken()

    if (!token) {
      console.error("No token found for WebSocket connection")
      setError("Not authenticated")
      return
    }

    // Close existing connection if any
    if (socketRef.current) {
      console.log("Closing existing WebSocket connection")
      socketRef.current.close()
    }

    console.log(`Creating new WebSocket connection for channel ${channelId}`)

    // Track reconnection attempts
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let reconnectTimeout: NodeJS.Timeout

    const connectWebSocket = () => {
      try {
        // Create new WebSocket connection
        const wsUrl = `wss://api.loryx.lol/chat/channels/${channelId}/ws`
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`)
        const socket = new WebSocket(wsUrl)

        socket.onopen = () => {
          console.log("WebSocket connection established")

          // Send the token as the first message after connection is established
          socket.send(JSON.stringify({ token }))

          setIsConnected(true)
          setError(null)
          reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        }

        socket.onmessage = (event) => {
          try {
            console.log("WebSocket message received (raw):", event.data)
            const data = JSON.parse(event.data)
            console.log("Parsed WebSocket message:", data)

            // Handle different message types as defined in the FastAPI code
            if (data.type === "message" || data.type === "media") {
              // Check if we've already processed this message ID
              if (!processedMessageIds.current.has(data.id)) {
                processedMessageIds.current.add(data.id)

                // Enhanced logging for media messages
                if (data.type === "media" || data.media_url) {
                  console.log("MEDIA MESSAGE RECEIVED:")
                  console.log("- type:", data.type)
                  console.log("- media_url:", data.media_url)
                  console.log("- content:", data.content)

                  // Ensure media messages have the correct type
                  if (data.media_url) {
                    data.type = "media"
                  }
                }

                setMessages((prev) => [...prev, data])
              } else {
                console.log("Duplicate message received, ignoring:", data.id)
              }
            } else if (data.type === "join" || data.type === "disconnect") {
              console.log(`${data.type} message:`, data.message)
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err)
          }
        }

        socket.onerror = (event) => {
          console.error("WebSocket error:", event)
          // Try to extract more error information if available
          let errorMessage = "WebSocket connection error"
          if (event && typeof event === "object") {
            errorMessage = JSON.stringify(event)
          }
          console.error(`Detailed error info: ${errorMessage}`)
          setError(`WebSocket error: ${errorMessage}`)
          setIsConnected(false)
        }

        socket.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason)
          setIsConnected(false)

          // If closed with code 4001, it means unauthorized (as defined in the FastAPI code)
          if (event.code === 4001 || event.code === 1008) {
            setError("Not authorized to access this channel")
            return // Don't attempt to reconnect if unauthorized
          }

          // Attempt to reconnect unless we've reached max attempts or it was a clean close
          if (reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff with 30s max
            console.log(
              `Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
            )

            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++
              connectWebSocket()
            }, delay)
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            setError("Could not reconnect to chat. Please refresh the page.")
          }
        }

        socketRef.current = socket
      } catch (err) {
        console.error("Error creating WebSocket:", err)
        setError("Failed to create WebSocket connection")
        setIsConnected(false)
      }
    }

    // Initial connection
    connectWebSocket()

    // Cleanup function
    return () => {
      console.log("Cleaning up WebSocket connection")
      clearTimeout(reconnectTimeout)
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounted") // Clean close
      }
    }
  }, [channelId])

  const sendMessage = (content: string | object) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected")
      return false
    }

    try {
      // If content is already a string, send it directly
      // Otherwise, stringify the object
      const messageToSend = typeof content === "string" ? JSON.stringify({ content }) : JSON.stringify(content)

      socketRef.current.send(messageToSend)
      return true
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Failed to send message")
      return false
    }
  }

  return {
    messages,
    isConnected,
    error,
    sendMessage,
  }
}

