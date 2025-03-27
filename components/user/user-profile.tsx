"use client"

import { useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/lib/types"
import { useStatusPing } from "@/hooks/use-status-ping"

interface UserCardProps {
  user: User
}

export function UserCard({ user }: UserCardProps) {
  // Initialize status ping for the viewed user profile
  // This ensures that when viewing someone's profile, we get their latest status
  const { isActive } = useStatusPing(user.id)

  // Effect to refresh user status periodically
  useEffect(() => {
    // This could be expanded to fetch the latest user status
    // For now, we're just using the status ping system
  }, [user.id])

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage
              src={user.profile_picture ? `https://api.loryx.lol/${user.profile_picture}` : ""}
              alt={user.username}
            />
            <AvatarFallback className="bg-zinc-800 text-xl">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900 ${user.is_active ? "bg-green-500" : "bg-zinc-500"}`}
          ></div>
        </div>

        <h2 className="text-xl font-bold">@{user.username}</h2>
        {user.nickname && <p className="text-zinc-400">{user.nickname}</p>}
        <div className="mt-1 text-xs text-zinc-400">{user.is_active ? "Online" : "Offline"}</div>
      </div>

      {user.bio && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">About</h3>
          <p className="text-sm bg-zinc-800 p-3 rounded-md">{user.bio}</p>
        </div>
      )}
    </div>
  )
}

