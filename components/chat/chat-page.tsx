"use client"

import { useState, useEffect } from "react"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ServerList } from "@/components/chat/server-list"
import { ChannelList } from "@/components/chat/channel-list"
import { VoiceChannel } from "@/components/chat/voice-channel"
import type { Server, Channel, User } from "@/lib/types"
import { useRouter } from "next/navigation"
import { UserProfile } from "@/components/chat/user-profile"
import { WelcomePage } from "@/components/chat/welcome-page"
import { MembersList } from "@/components/chat/members-list"
import { useStatusPing } from "@/hooks/use-status-ping"

export default function ChatPage() {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()

  // Initialize the status ping system once we have a user ID
  const { isActive } = useStatusPing(user?.id)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Use our API route to check authentication
        const response = await fetch("/api/auth/get-user")
        const data = await response.json()

        if (!response.ok || !data.authenticated) {
          console.log("Not authenticated, redirecting to login")
          window.location.href = "/auth/login"
          return
        }

        setUser(data.user)
        setIsLoading(false)
      } catch (error) {
        console.error("Error checking authentication:", error)

        // Try to use localStorage token as a fallback
        const token = localStorage.getItem("token")
        if (token) {
          try {
            const response = await fetch("https://api.loryx.lol/auth/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (response.ok) {
              const userData = await response.json()
              setUser(userData)
              setIsLoading(false)
              return
            }
          } catch (e) {
            console.error("Fallback auth failed:", e)
          }
        }

        setError("Authentication error")
        setIsLoading(false)

        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/auth/login"
        }, 2000)
      }
    }

    checkAuth()
  }, [])

  // Handle server selection
  const handleServerSelect = (server: Server) => {
    console.log("Selected server:", server)
    setSelectedServer(server)
    setSelectedChannel(null) // Reset channel selection when changing servers
    setShowWelcome(false)
  }

  // Handle channel selection
  const handleChannelSelect = (channel: Channel) => {
    console.log("Selected channel:", channel)
    setSelectedChannel(channel)
  }

  // Handle no servers case
  const handleNoServers = () => {
    setSelectedServer(null)
    setSelectedChannel(null)
    setShowWelcome(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="text-white text-center">
          <img
            src="/images/calyx-logo-transparent.png"
            alt="Loryx Logo"
            className="h-20 w-auto mx-auto mb-6 animate-pulse"
          />
          <div className="mb-4 text-xl">Loading Loryx...</div>
          <div className="text-zinc-400 text-sm">Please wait while we set up your chat environment</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="mb-4 text-xl text-red-500">Error Loading Chat</div>
          <div className="text-zinc-400">{error}</div>
          <button
            onClick={() => (window.location.href = "/auth/login")}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Server list - now on the left side */}
      <ServerList
        onSelectServer={handleServerSelect}
        selectedServerId={selectedServer?.id}
        onNoServers={handleNoServers}
      />

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Channel list with settings at bottom */}
        <div className="w-60 h-full flex flex-col bg-zinc-900">
          <ChannelList
            server={selectedServer}
            onSelectChannel={handleChannelSelect}
            selectedChannelId={selectedChannel?.id}
          />
          {user && <UserProfile user={user} />}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedServer && selectedChannel ? (
            <>
              <ChatHeader channel={selectedChannel} server={selectedServer} />
              <div className="flex-1 flex">
                <div className="flex-1 flex flex-col">
                  {selectedChannel.type === "text" ? (
                    <>
                      <ChatMessages channel={selectedChannel} currentUser={user} />
                      <ChatInput channel={selectedChannel} server={selectedServer} />
                    </>
                  ) : (
                    <VoiceChannel channel={selectedChannel} currentUser={user} />
                  )}
                </div>
                {/* Members list - always visible on the right */}
                {selectedServer && (
                  <div className="w-60 border-l border-zinc-800 bg-zinc-900">
                    <MembersList serverId={selectedServer.id} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <WelcomePage />
          )}
        </div>
      </div>
    </div>
  )
}

