import type { Channel, Server } from "@/lib/types"
import { Hash, Volume2, Users } from "lucide-react"

interface ChatHeaderProps {
  channel: Channel | null
  server?: Server | null
}

export function ChatHeader({ channel, server }: ChatHeaderProps) {
  if (!channel) {
    return (
      <div className="h-14 border-b border-zinc-800 flex items-center px-4 bg-zinc-900">
        <div className="flex items-center">
          <span className="text-lg font-medium text-zinc-400">Select a channel</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
      <div className="flex items-center">
        {channel.type === "text" ? (
          <Hash className="h-5 w-5 mr-2" />
        ) : (
          <Volume2 className="h-5 w-5 mr-2 text-green-400" />
        )}
        <span className="text-lg font-medium">{channel.name}</span>
        {server && <span className="ml-2 text-sm text-zinc-400">| {server.name}</span>}

        {channel.type === "voice" && channel.member_count && channel.member_count > 0 && (
          <span className="ml-2 bg-green-500/20 text-green-400 text-xs rounded-full px-2 py-0.5">
            {channel.member_count} {channel.member_count === 1 ? "user" : "users"}
          </span>
        )}
      </div>

      <div className="flex items-center">
        <div className="flex items-center text-zinc-400 text-sm">
          <Users className="h-4 w-4 mr-1" />
          <span>{server?.member_count || 0}</span>
        </div>
      </div>
    </div>
  )
}

