"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useStatusPing } from "@/hooks/use-status-ping"

// Create a context for user status
const StatusContext = createContext<{
  userId: string | null
  isOnline: boolean
  setUserId: (id: string | null) => void
}>({
  userId: null,
  isOnline: false,
  setUserId: () => {},
})

// Provider component that wraps the app
export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)

  // Initialize the status ping system
  const { isActive } = useStatusPing(userId || undefined)

  // Try to get the user ID from localStorage or cookies on mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        // Try to get user data from the API
        const response = await fetch("/api/auth/get-user")
        const data = await response.json()

        if (data.authenticated && data.user && data.user.id) {
          setUserId(data.user.id)
        }
      } catch (error) {
        console.error("Error getting user ID:", error)
      }
    }

    getUserId()
  }, [])

  return <StatusContext.Provider value={{ userId, isOnline: isActive, setUserId }}>{children}</StatusContext.Provider>
}

// Hook to use the status context
export function useStatus() {
  return useContext(StatusContext)
}

