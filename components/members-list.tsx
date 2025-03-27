"use client"

import { useState, useEffect } from "react"
import { getServerMembers } from "@/lib/api"
import type { User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserCard } from "@/components/user/user-card"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface MembersListProps {
  serverId: string
}

export function MembersList({ serverId }: MembersListProps) {
  const [members, setMembers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadMembers = async () => {
      if (!serverId) return

      setIsLoading(true)
      setError(null)
      try {
        const memberList = await getServerMembers(serverId)
        setMembers(memberList)
      } catch (error) {
        console.error("Error loading server members:", error)
        setError(error instanceof Error ? error.message : "Failed to load server members")
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
  }, [serverId, toast])

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
  }

  // Group members by online status
  const onlineMembers = members.filter((member) => member.is_active)
  const offlineMembers = members.filter((member) => !member.is_active)

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400">MEMBERS — {members.length}</h3>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-400">{error}</div>
          ) : (
            <div className="p-2">
              {onlineMembers.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-zinc-400 px-2 mb-1">ONLINE — {onlineMembers.length}</div>
                  {onlineMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center p-2 rounded hover:bg-zinc-800 cursor-pointer"
                      onClick={() => handleUserClick(member)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.profile_picture || ""} alt={member.username} />
                          <AvatarFallback className="bg-zinc-800">
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 bg-green-500"></div>
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium truncate">@{member.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {offlineMembers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-zinc-400 px-2 mb-1">OFFLINE — {offlineMembers.length}</div>
                  {offlineMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center p-2 rounded hover:bg-zinc-800 cursor-pointer"
                      onClick={() => handleUserClick(member)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.profile_picture || ""} alt={member.username} />
                          <AvatarFallback className="bg-zinc-800">
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 bg-zinc-500"></div>
                      </div>
                      <div className="overflow-hidden text-zinc-400">
                        <div className="text-sm font-medium truncate">@{member.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          {selectedUser && <UserCard user={selectedUser} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

