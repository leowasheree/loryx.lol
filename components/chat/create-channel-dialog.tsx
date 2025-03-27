"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createChannel } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Channel } from "@/lib/types"

// Helper function to extract error messages from Pydantic validation errors
const extractErrorMessage = (error: any): string => {
  // Check if it's a Pydantic validation error (has type, loc, msg, input)
  if (error && typeof error === "object" && "msg" in error) {
    return error.msg || "Validation error"
  }

  // Check if it's an array of validation errors
  if (Array.isArray(error)) {
    return error.map((err) => extractErrorMessage(err)).join(", ")
  }

  // Check if it has a detail field (common in FastAPI errors)
  if (error && typeof error === "object" && "detail" in error) {
    // The detail could be a string or another validation object
    return typeof error.detail === "string" ? error.detail : extractErrorMessage(error.detail)
  }

  // Default case: convert to string
  return String(error || "Unknown error")
}

interface CreateChannelDialogProps {
  serverId: string
  onChannelCreated: (channel: Channel) => void
  onClose: () => void
}

export function CreateChannelDialog({ serverId, onChannelCreated, onClose }: CreateChannelDialogProps) {
  const [newChannelName, setNewChannelName] = useState("")
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text")
  const [channelNameError, setChannelNameError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const validateChannelName = (name: string): boolean => {
    setChannelNameError(null)

    if (!name.trim()) {
      setChannelNameError("Channel name is required")
      return false
    }

    if (name.trim().length < 3) {
      setChannelNameError("Channel name must be at least 3 characters")
      return false
    }

    return true
  }

  const handleCreateChannel = async () => {
    if (!validateChannelName(newChannelName)) return

    setIsCreating(true)
    setChannelNameError(null)

    try {
      const newChannel = await createChannel(serverId, newChannelName.trim(), newChannelType)

      toast({
        title: "Success",
        description: "Channel created successfully",
      })

      // Call the callback with the new channel
      onChannelCreated(newChannel)
      onClose()
    } catch (error) {
      console.error("Error creating channel:", error)

      // Make sure error message is a string
      let errorMessage = error instanceof Error ? error.message : extractErrorMessage(error)

      // Check for the specific "Not server owner" error
      if (errorMessage.includes("Not server owner")) {
        errorMessage = "You must be the server owner to create channels"
      }

      setChannelNameError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create a new channel</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {channelNameError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{channelNameError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel name</Label>
            <Input
              id="channel-name"
              placeholder="Enter channel name (min. 3 characters)"
              value={newChannelName}
              onChange={(e) => {
                setNewChannelName(e.target.value)
                if (channelNameError) validateChannelName(e.target.value)
              }}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-type">Channel type</Label>
            <Select value={newChannelType} onValueChange={(value) => setNewChannelType(value as "text" | "voice")}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select channel type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button onClick={handleCreateChannel} disabled={isCreating || !newChannelName.trim()} className="flex-1">
              {isCreating ? "Creating..." : "Create Channel"}
            </Button>
            <Button variant="outline" onClick={onClose} className="bg-zinc-800 border-zinc-700">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

