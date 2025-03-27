"use client"
import { useVoiceChat } from "@/hooks/use-voice-chat"
import { Button } from "@/components/ui/button"
import { AlertCircle, Headphones, MessageSquare } from "lucide-react"
import type { Channel, User } from "@/lib/types"
import { useRouter } from "next/navigation"

interface VoiceChannelProps {
  channel: Channel
  currentUser?: User | null
}

export function VoiceChannel({ channel, currentUser }: VoiceChannelProps) {
  const { error } = useVoiceChat(channel.id)
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-black">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-500/20 text-green-400 rounded-full p-2 mr-3">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-medium">Voice Channel: {channel.name}</h2>
            <p className="text-sm text-zinc-400">Voice channels are currently view-only</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md p-6 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Voice Chat Not Available</h3>
          <p className="text-zinc-400 mb-6">
            Voice chat functionality is not implemented in this version of the application. You can still use text
            channels for communication.
          </p>
          <Button onClick={() => router.push("/chat")} className="bg-indigo-600 hover:bg-indigo-700">
            <MessageSquare className="h-4 w-4 mr-2" />
            Go to Text Channels
          </Button>
        </div>
      </div>
    </div>
  )
}

