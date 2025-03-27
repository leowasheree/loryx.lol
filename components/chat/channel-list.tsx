"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Hash, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Channel, Server } from "@/lib/types"
import { fetchChannels } from "@/lib/api"
import { CreateChannelDialog } from "./create-channel-dialog"
import { ServerActions } from "@/components/server/server-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChannelListProps {
  server: Server | null
  onSelectChannel: (channel: Channel) => void
  selectedChannelId?: string
}

export function ChannelList({ server, onSelectChannel, selectedChannelId }: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()
  const [isServerOwner, setIsServerOwner] = useState(false)
  const [updatedServer, setUpdatedServer] = useState<Server | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!server) return

    const loadChannels = async () => {
      setIsLoading(true)
      try {
        const channelList = await fetchChannels(server.id)
        console.log("Loaded channels:", channelList)
        setChannels(channelList || [])

        // Select the first channel by default if available
        if (channelList && channelList.length > 0 && !selectedChannelId) {
          console.log("Auto-selecting first channel:", channelList[0])
          onSelectChannel(channelList[0])
        }
      } catch (error) {
        console.error("Error loading channels:", error)
        toast({
          title: "Error",
          description: "Failed to load channels",
          variant: "destructive",
        })
        // Set empty array to prevent undefined errors
        setChannels([])
      } finally {
        setIsLoading(false)
      }
    }

    loadChannels()

    // Set up refresh interval for voice channels
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }

    const interval = setInterval(() => {
      loadChannels()
    }, 10000) // Refresh every 10 seconds

    setRefreshInterval(interval)

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [server, onSelectChannel, selectedChannelId, toast])

  const handleChannelCreated = (newChannel: Channel) => {
    console.log("New channel created:", newChannel)
    setChannels((prev) => [...prev, newChannel])
    onSelectChannel(newChannel)
  }

  const handleServerLeft = () => {
    // This will be handled by the parent component through the server list refresh
  }

  const handleServerUpdated = (updated: Server) => {
    setUpdatedServer(updated)
  }

  useEffect(() => {
    if (!server) return

    // Get the current user from localStorage or cookies
    const getUser = async () => {
      try {
        const response = await fetch("/api/auth/get-user")
        const data = await response.json()

        if (data.authenticated && data.user) {
          // Check if the current user's username matches the server owner
          setIsServerOwner(data.user.username === server.owner)
        }
      } catch (error) {
        console.error("Error checking if user is server owner:", error)
        setIsServerOwner(false)
      }
    }

    getUser()
  }, [server])

  // Use the updated server data if available, otherwise use the original server
  const currentServer = updatedServer || server

  if (!currentServer) {
    return (
      <div className="w-60 h-full bg-zinc-900 p-4 flex flex-col">
        <div className="text-center text-zinc-400 mt-8">Select a server to view channels</div>
      </div>
    )
  }

  return (
    <div className="w-60 h-full bg-zinc-900 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-hidden">
          {currentServer.profile_picture ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.loryx.lol/${currentServer.profile_picture}`} alt={currentServer.name} />
              <AvatarFallback className="bg-zinc-800">{currentServer.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <span className="text-lg font-semibold">{currentServer.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h2 className="text-xl font-bold truncate">{currentServer.name}</h2>
        </div>
        <ServerActions
          server={currentServer}
          isOwner={isServerOwner}
          onServerLeft={handleServerLeft}
          onServerUpdated={handleServerUpdated}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-400">CHANNELS</h3>
            {isServerOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-zinc-800"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 text-zinc-400" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="h-10 w-auto animate-pulse" />
              </div>
            ) : channels.length === 0 ? (
              <div className="text-zinc-400 text-sm py-2 px-2">
                No channels found. {isServerOwner ? "Create one with the + button above." : ""}
              </div>
            ) : (
              channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`w-full justify-start text-zinc-300 hover:bg-zinc-800 ${
                    selectedChannelId === channel.id ? "bg-zinc-800" : ""
                  }`}
                  onClick={() => onSelectChannel(channel)}
                >
                  {channel.type === "text" ? (
                    <Hash className="h-4 w-4 mr-2" />
                  ) : (
                    <div className="flex items-center">
                      <Volume2 className="h-4 w-4 mr-2" />
                      {channel.member_count && channel.member_count > 0 && (
                        <span className="bg-green-500/20 text-green-400 text-xs rounded-full px-1.5 py-0.5 ml-1">
                          {channel.member_count}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="truncate">{channel.name}</span>
                </Button>
              ))
            )}
          </div>
        </div>

        {currentServer.bio && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">ABOUT</h3>
            <div className="bg-zinc-800 p-3 rounded-md text-sm text-zinc-300">{currentServer.bio}</div>
          </div>
        )}
      </div>

      {/* Custom dialog implementation */}
      {showCreateDialog && currentServer && (
        <CreateChannelDialog
          serverId={currentServer.id}
          onChannelCreated={handleChannelCreated}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  )
}

