"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { joinServerViaInvite } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function JoinServerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [isJoining, setIsJoining] = useState(false)
  const [serverName, setServerName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const serverId = params.serverId as string

  const handleJoinServer = async () => {
    setIsJoining(true)
    setError(null)

    try {
      const server = await joinServerViaInvite(serverId)

      toast({
        title: "Success",
        description: `Joined server "${server.name}" successfully`,
      })

      // Redirect to chat page
      router.push("/chat")
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

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token") || document.cookie.includes("token=")

    if (!token) {
      // Store the invite code in localStorage so we can retrieve it after login
      localStorage.setItem("pendingInvite", serverId)
      // Redirect to login page with return URL
      router.push(`/auth/login?returnUrl=/join-server/${serverId}`)
    }
  }, [serverId, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-6 bg-zinc-900 p-8 rounded-lg border border-zinc-800">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Loryx Server Invitation</h1>
          <p className="text-gray-400">
            {serverName ? `You've been invited to join "${serverName}"` : "You've been invited to join a server"}
          </p>
        </div>

        {error && <div className="bg-red-900/20 border border-red-800 text-red-100 px-4 py-3 rounded">{error}</div>}

        <Button onClick={handleJoinServer} disabled={isJoining} className="w-full">
          {isJoining ? "Joining..." : "Accept Invitation"}
        </Button>

        <div className="text-center text-sm">
          <p className="text-gray-400">
            <Button
              variant="link"
              onClick={() => router.push("/chat")}
              className="text-primary hover:underline p-0 h-auto"
            >
              Return to chat
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}

