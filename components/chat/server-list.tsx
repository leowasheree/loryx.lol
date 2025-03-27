"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Server } from "@/lib/types"
import { fetchServers, createServer } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { JoinServerDialog } from "@/components/server/join-server-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ServerListProps {
  onSelectServer: (server: Server) => void
  selectedServerId?: string
  onNoServers?: () => void
}

export function ServerList({ onSelectServer, selectedServerId, onNoServers }: ServerListProps) {
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newServerName, setNewServerName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [serverNameError, setServerNameError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const { toast } = useToast()

  const loadServers = async (showToast = false) => {
    try {
      setIsLoading(true)
      setApiError(null)

      // Add retry logic
      let attempts = 0
      let serverList: Server[] = []
      let fetchError: Error | null = null

      while (attempts < 3) {
        try {
          serverList = await fetchServers()
          fetchError = null
          break // Success, exit the retry loop
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error)
          fetchError = error instanceof Error ? error : new Error(String(error))

          // Don't treat "No servers found" as an error that needs retrying or displaying
          if (error.message && error.message.includes("No servers found")) {
            console.log("No servers found, this is normal for new users")
            fetchError = null
            serverList = []
            break
          }

          attempts++

          if (attempts < 3) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempts)))
          }
        }
      }

      if (fetchError) {
        throw fetchError
      }

      console.log("Servers loaded:", serverList)
      setServers(serverList || [])

      // Select the first server by default if available
      if (serverList && serverList.length > 0 && !selectedServerId) {
        console.log("Selecting first server:", serverList[0])
        onSelectServer(serverList[0])
      } else if (serverList.length === 0 && onNoServers) {
        // Call the onNoServers callback if there are no servers
        onNoServers()
      }

      if (showToast) {
        toast({
          title: "Refreshed",
          description: "Server list has been refreshed",
        })
      }
    } catch (error) {
      console.error("Error loading servers:", error)

      // Set a specific API error message
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setApiError("Could not connect to the chat server. The server might be unavailable.")
      } else if (error.name === "AbortError") {
        setApiError("Request timed out. Please check your connection and try again.")
      } else if (error.message && error.message.includes("404")) {
        // Handle 404 error specifically - don't show error for new users
        setApiError(null)
        setServers([])
        if (onNoServers) onNoServers()
      } else {
        // Only show critical errors, not "No servers found"
        if (!error.message || !error.message.includes("No servers found")) {
          setApiError(`Error: ${error.message || "Unknown error occurred"}`)
        } else {
          setApiError(null)
        }
      }

      // Set empty array to prevent undefined errors
      setServers([])
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    loadServers()
  }, [onSelectServer, selectedServerId, toast, onNoServers])

  const handleRetry = () => {
    setIsRetrying(true)
    loadServers(true)
  }

  const validateServerName = (name: string): boolean => {
    setServerNameError(null)

    if (!name.trim()) {
      setServerNameError("Server name is required")
      return false
    }

    if (name.trim().length < 3) {
      setServerNameError("Server name must be at least 3 characters")
      return false
    }

    return true
  }

  const handleCreateServer = async () => {
    if (!validateServerName(newServerName)) {
      return
    }

    setIsCreating(true)
    setServerNameError(null)

    try {
      // Create the server - this will automatically set the current user as owner
      // and add them to the members list as per the backend implementation
      const newServer = await createServer(newServerName.trim())

      // Update the local servers list
      setServers((prev) => [...prev, newServer])
      setNewServerName("")
      setIsDialogOpen(false)

      toast({
        title: "Success",
        description: "Server created successfully",
      })

      // Select the newly created server
      onSelectServer(newServer)
    } catch (error) {
      console.error("Error creating server:", error)

      // Display specific error message if available
      const errorMessage = error instanceof Error ? error.message : "Failed to create server"
      setServerNameError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Function to directly open the dialog when + button is clicked
  const handlePlusClick = () => {
    setServerNameError(null)
    setNewServerName("")
    setIsDialogOpen(true)
  }

  const handleServerJoined = (server: Server) => {
    setServers((prev) => [...prev, server])
    onSelectServer(server)
    setShowJoinDialog(false)
    toast({
      title: "Success",
      description: `Joined server "${server.name}" successfully`,
    })
  }

  const handleServerLeft = (serverId: string) => {
    setServers((prev) => prev.filter((server) => server.id !== serverId))

    // If the current server was left, select another one if available
    if (selectedServerId === serverId && servers.length > 1) {
      const nextServer = servers.find((server) => server.id !== serverId)
      if (nextServer) {
        onSelectServer(nextServer)
      } else if (onNoServers) {
        onNoServers()
      }
    }
  }

  // Update server in the list when it's updated
  const updateServer = (updatedServer: Server) => {
    setServers((prev) => prev.map((server) => (server.id === updatedServer.id ? updatedServer : server)))
  }

  return (
    <div className="w-16 h-full bg-zinc-950 flex flex-col items-center py-4 space-y-2">
      {isLoading ? (
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="w-8 h-8 animate-pulse" />
        </div>
      ) : apiError ? (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center text-xs text-center text-zinc-400 mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700"
            onClick={handleRetry}
            disabled={isRetrying}
            title="Retry connection"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          </Button>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center">
          <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="w-10 h-10 mb-2" />
          <div className="text-xs text-zinc-400 text-center">No servers</div>
        </div>
      ) : (
        servers.map((server) => (
          <Button
            key={server.id}
            variant="ghost"
            className={`w-12 h-12 rounded-full flex items-center justify-center p-0 ${
              selectedServerId === server.id ? "bg-zinc-700" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            onClick={() => onSelectServer(server)}
            title={server.name}
          >
            {server.profile_picture ? (
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.loryx.lol/${server.profile_picture}`} alt={server.name} />
                <AvatarFallback className="bg-zinc-800">{server.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {server.name.charAt(0).toUpperCase()}
              </div>
            )}
          </Button>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* Remove DialogTrigger and use direct click handler on the button */}
        <Button
          variant="ghost"
          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center p-0"
          onClick={handlePlusClick}
          title="Create new server"
        >
          <Plus className="h-6 w-6" />
        </Button>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Create a new server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {serverNameError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{serverNameError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Server name</Label>
              <Input
                id="name"
                placeholder="Enter server name (min. 3 characters)"
                value={newServerName}
                onChange={(e) => {
                  setNewServerName(e.target.value)
                  if (serverNameError) validateServerName(e.target.value)
                }}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <Button onClick={handleCreateServer} disabled={isCreating || !newServerName.trim()} className="w-full">
              {isCreating ? "Creating..." : "Create Server"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-zinc-900 px-2 text-zinc-400">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              onClick={() => {
                setIsDialogOpen(false)
                setShowJoinDialog(true)
              }}
            >
              Join an existing server
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <JoinServerDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} onServerJoined={handleServerJoined} />
    </div>
  )
}

