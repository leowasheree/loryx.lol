"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

/**
 * Hook to send regular pings to the server to indicate the user is online
 * @param userId The ID of the current user
 * @param pingInterval Interval in milliseconds between pings (default: 50000ms - slightly less than 60s for safety)
 * @returns Object containing the ping status
 */
export function useStatusPing(userId: string | undefined, pingInterval = 50000) {
  const [isActive, setIsActive] = useState(true)
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Function to send a ping to the server
  const sendPing = async () => {
    if (!userId) {
      console.log("No user ID available, skipping ping")
      return
    }

    try {
      // Get the authentication token
      const token = getToken()
      if (!token) {
        console.error("No authentication token found")
        setError("Authentication token not found")
        return
      }

      // Send the ping to the server with user_id as a query parameter
      const response = await fetch(`https://api.loryx.lol/auth/ping?user_id=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // No body needed as we're using query parameters
      })

      if (!response.ok) {
        throw new Error(`Failed to send ping: ${response.status}`)
      }

      // Update the last ping time
      const now = new Date()
      setLastPingTime(now)
      console.log(`Ping sent at ${now.toISOString()}`)

      // Reset any previous errors
      setError(null)
    } catch (err) {
      console.error("Error sending ping:", err)
      setError(err instanceof Error ? err.message : "Failed to send ping")

      // Don't show toast for ping errors to avoid spamming the user
      // Only log to console
    }
  }

  // Helper function to get the authentication token
  const getToken = () => {
    // Try to get from cookie first
    const tokenFromCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]

    if (tokenFromCookie) {
      return decodeURIComponent(tokenFromCookie)
    }

    // If not found in cookie, try localStorage as fallback
    const tokenFromStorage = localStorage.getItem("token")
    if (tokenFromStorage) {
      return tokenFromStorage
    }

    return null
  }

  // Set up the ping interval when the component mounts
  useEffect(() => {
    if (!userId) return

    // Send an initial ping
    sendPing()

    // Set up the interval to send pings regularly
    pingIntervalRef.current = setInterval(sendPing, pingInterval)

    // Set up visibility change listener to handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // User has returned to the tab, send a ping immediately
        sendPing()

        // Reset the interval to ensure regular pings
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(sendPing, pingInterval)

        setIsActive(true)
      } else {
        // User has left the tab
        setIsActive(false)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Clean up the interval and event listener when the component unmounts
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [userId, pingInterval])

  return {
    isActive,
    lastPingTime,
    error,
  }
}

