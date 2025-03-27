"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { setVanityUrl } from "@/lib/api" // Make sure this import is included
import type { Server } from "@/lib/types"

interface VanityUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server
  onVanityUrlSet: (inviteLink: string) => void
}

export function VanityUrlDialog({ open, onOpenChange, server, onVanityUrlSet }: VanityUrlDialogProps) {
  const [vanityUrl, setVanityUrlState] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSetVanityUrl = async () => {
    setError(null)

    if (!vanityUrl.trim()) {
      setError("Vanity URL is required")
      return
    }

    // Basic validation for vanity URL
    if (!/^[a-zA-Z0-9-_]+$/.test(vanityUrl)) {
      setError("Vanity URL can only contain letters, numbers, hyphens, and underscores")
      return
    }

    setIsSubmitting(true)

    try {
      console.log(`Setting vanity URL "${vanityUrl}" for server ${server.id}...`)

      const result = await setVanityUrl(server.id, vanityUrl.trim())
      console.log("Set vanity URL result:", result)

      onVanityUrlSet(result.invite_link)

      toast({
        title: "Custom URL set",
        description: `Your server can now be joined using the custom URL: ${vanityUrl}`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error setting vanity URL:", error)
      setError(error instanceof Error ? error.message : "Failed to set vanity URL")

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set vanity URL",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Set Custom Invite URL</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a memorable URL for people to join your server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="vanity-url">Custom URL</Label>
            <div className="flex items-center space-x-1">
              <div className="text-sm text-zinc-400 whitespace-nowrap">.../join-server/</div>
              <Input
                id="vanity-url"
                placeholder="awesome-server"
                value={vanityUrl}
                onChange={(e) => setVanityUrlState(e.target.value)}
                className="bg-zinc-800 border-zinc-700 flex-1"
              />
            </div>
            <p className="text-xs text-zinc-400">
              Use only letters, numbers, hyphens, and underscores. Choose something unique and memorable.
            </p>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button onClick={handleSetVanityUrl} disabled={isSubmitting || !vanityUrl.trim()} className="flex-1">
              {isSubmitting ? "Setting..." : "Set Custom URL"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-800 border-zinc-700">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

