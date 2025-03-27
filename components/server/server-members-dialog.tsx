"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getServerMembers } from "@/lib/api"
import type { Server, User } from "@/lib/types"
import { Search, X, Users } from "lucide-react"
import { UserCard } from "@/components/user/user-card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ServerMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server
}

export function ServerMembersDialog({ open, onOpenChange, server }: ServerMembersDialogProps) {
  const [members, setMembers] = useState<User[]>([])
  const [filteredMembers, setFilteredMembers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadMembers()
    }
  }, [open, server.id])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredMembers(
        members.filter(
          (member) =>
            member.username.toLowerCase().includes(query) ||
            (member.nickname && member.nickname.toLowerCase().includes(query)),
        ),
      )
    }
  }, [searchQuery, members])

  const loadMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const memberList = await getServerMembers(server.id)
      setMembers(memberList)
      setFilteredMembers(memberList)
    } catch (error) {
      console.error("Error loading server members:", error)
      setError(error instanceof Error ? error.message : "Failed to load server members")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load server members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
  }

  const handleBackToList = () => {
    setSelectedUser(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {selectedUser ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={handleBackToList}>
                  <X className="h-4 w-4" />
                </Button>
                User Profile
              </>
            ) : (
              <>
                <Users className="h-5 w-5 mr-2" />
                Members - {server.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedUser ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search members"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-800 border-zinc-700 pl-10"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-400 py-4">{error}</div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center text-zinc-400 py-4">
                  {searchQuery ? "No members match your search" : "No members found"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-2 rounded-md hover:bg-zinc-800 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(member)}
                    >
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden">
                            {member.profile_picture ? (
                              <img
                                src={member.profile_picture || "/placeholder.svg"}
                                alt={member.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                {member.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${member.is_active ? "bg-green-500" : "bg-zinc-500"}`}
                          ></div>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium">@{member.username}</div>
                          {member.nickname && <div className="text-sm text-zinc-400">{member.nickname}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <UserCard user={selectedUser} />
        )}
      </DialogContent>
    </Dialog>
  )
}

