"use client"

import { Button } from "@/components/ui/button"
import { LogOut, User, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import type { User as UserType } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserProfileProps {
  user: UserType | null
}

export function UserProfile({ user }: UserProfileProps) {
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      // Call the logout API route to clear cookies
      await fetch("/api/auth/logout", {
        method: "POST",
      })

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      })

      // Force a hard navigation to the login page
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("Error logging out:", error)
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
      <div className="flex items-center">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center mr-2">
            {user?.profile_picture ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://api.loryx.lol/${user.profile_picture}`} alt={user.username} />
                <AvatarFallback className="bg-zinc-800">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          {user && (
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${user.is_active ? "bg-green-500" : "bg-zinc-500"}`}
            ></div>
          )}
        </div>
        <div className="text-sm">
          <div className="font-medium truncate w-32">{user?.nickname || user?.username || "Loading..."}</div>
          {user && <div className="text-xs text-zinc-400">{user.is_active ? "Online" : "Offline"}</div>}
        </div>
      </div>
      <div className="flex">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/profile">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

