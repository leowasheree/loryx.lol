"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function InviteRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  useEffect(() => {
    // Redirect to the new URL format
    router.replace(`/join-server/${code}`)
  }, [code, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="text-center">
        <img
          src="/images/calyx-logo-transparent.png"
          alt="Loryx Logo"
          className="h-16 w-auto mx-auto mb-4 animate-pulse"
        />
        <p className="text-zinc-400">Redirecting...</p>
      </div>
    </div>
  )
}

