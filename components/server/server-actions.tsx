"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MoreVertical, LogOut, LinkIcon, Copy, Check, UserPlus, Link2, Settings, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { generateInviteLink, leaveServer } from "@/lib/api"
import type { Server } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VanityUrlDialog } from "./vanity-url-dialog"
import { ServerSettingsDialog } from "./server-settings-dialog"
import { ServerMembersDialog } from "./server-members-dialog"

interface ServerActionsProps {
  server: Server
  isOwner: boolean
  onServerLeft: () => void
  onServerUpdated?: (updatedServer: Server) => void
}

export function ServerActions({ server, isOwner, onServerLeft, onServerUpdated }: ServerActionsProps) {
  const { toast } = useToast()
  const [isLeaving, setIsLeaving] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showVanityUrlDialog, setShowVanityUrlDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showMembersDialog, setShowMembersDialog] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleLeaveServer = async () => {
    if (!confirm(`Are you sure you want to leave "${server.name}"?`)) {
      return
    }

    setIsLeaving(true)
    try {
      await leaveServer(server.id)
      toast({
        title: "Server left",
        description: `You have left "${server.name}"`,
      })
      onServerLeft()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave server",
        variant: "destructive",
      })
    } finally {
      setIsLeaving(false)
    }
  }

  const handleGenerateInvite = async () => {
    setIsGeneratingLink(true)
    setCopied(false)

    try {
      const data = await generateInviteLink(server.id)
      setInviteLink(data.invite_link)
      setShowInviteDialog(true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite link",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleVanityUrlSet = (newInviteLink: string) => {
    if (!newInviteLink) {
      console.error("Invalid invite link received:", newInviteLink)
      toast({
        title: "Error",
        description: "Failed to get invite link",
        variant: "destructive",
      })
      return
    }

    setInviteLink(newInviteLink)
    setShowVanityUrlDialog(false)
    setShowInviteDialog(true)
  }

  const handleServerUpdated = (updatedServer: Server) => {
    if (onServerUpdated) {
      onServerUpdated(updatedServer)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        })
      })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
          <DropdownMenuItem
            onClick={() => setShowMembersDialog(true)}
            className="cursor-pointer flex items-center text-sm"
          >
            <Users className="mr-2 h-4 w-4" />
            <span>View Members</span>
          </DropdownMenuItem>

          {isOwner && (
            <DropdownMenuItem
              onClick={handleGenerateInvite}
              disabled={isGeneratingLink}
              className="cursor-pointer flex items-center text-sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Invite People</span>
            </DropdownMenuItem>
          )}

          {isOwner && (
            <DropdownMenuItem
              onClick={() => setShowVanityUrlDialog(true)}
              className="cursor-pointer flex items-center text-sm"
            >
              <Link2 className="mr-2 h-4 w-4" />
              <span>Set Custom Invite URL</span>
            </DropdownMenuItem>
          )}

          {isOwner && (
            <DropdownMenuItem
              onClick={() => setShowSettingsDialog(true)}
              className="cursor-pointer flex items-center text-sm"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Server Settings</span>
            </DropdownMenuItem>
          )}

          {!isOwner && (
            <DropdownMenuItem
              onClick={handleLeaveServer}
              disabled={isLeaving}
              className="cursor-pointer flex items-center text-sm text-red-500 focus:text-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Leave Server</span>
            </DropdownMenuItem>
          )}

          {isOwner && <DropdownMenuSeparator className="bg-zinc-800" />}

          {isOwner && (
            <DropdownMenuItem
              className="cursor-pointer flex items-center text-sm text-red-500 focus:text-red-500"
              onClick={() =>
                toast({
                  title: "Not implemented",
                  description: "Server deletion is not implemented yet",
                })
              }
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Delete Server</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Invite people to {server.name}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Share this link with others to invite them to your server
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 mt-4">
            <div className="bg-zinc-800 p-2 rounded flex-1 flex items-center overflow-hidden">
              <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0 text-zinc-400" />
              <div className="text-sm truncate overflow-hidden">{inviteLink}</div>
            </div>
            <Button size="sm" onClick={copyToClipboard} className="flex-shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="text-xs text-zinc-400 mt-2">
            This invite link is permanent and can be used multiple times.
          </div>
        </DialogContent>
      </Dialog>

      {isOwner && (
        <VanityUrlDialog
          open={showVanityUrlDialog}
          onOpenChange={setShowVanityUrlDialog}
          server={server}
          onVanityUrlSet={handleVanityUrlSet}
        />
      )}

      {isOwner && (
        <ServerSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          server={server}
          onServerUpdated={handleServerUpdated}
        />
      )}

      <ServerMembersDialog open={showMembersDialog} onOpenChange={setShowMembersDialog} server={server} />
    </>
  )
}

