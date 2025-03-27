"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { joinServerViaInvite } from "@/lib/api"
import type { Server } from "@/lib/types"

interface JoinServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServerJoined: (server: Server) => void
}

export function JoinServerDialog({ open, onOpenChange, onServerJoined }: JoinServerDialogProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const { toast } = useToast()

  const handleJoinServer = async () => {
    setError(null)

    if (!inviteCode.trim()) {
      setError("Invite code is required")
      return
    }

    setIsJoining(true)

    try {
      const server = await joinServerViaInvite(inviteCode.trim())
      onServerJoined(server)

      // Reset form
      setInviteCode("")
    } catch (error) {
      console.error("Error joining server:", error)
      setError(error instanceof Error ? error.message : "Failed to join server")

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join server",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Join a server</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
            <p className="text-xs text-zinc-400">Enter the invite code you received from the server owner.</p>
          </div>

          <Button onClick={handleJoinServer} disabled={isJoining || !inviteCode.trim()} className="w-full">
            {isJoining ? "Joining..." : "Join Server"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

