"use client"

import { MessageSquare, Users, Server } from "lucide-react"

export function WelcomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black p-8">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6">
          <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="h-24 w-auto" />
        </div>
        <h1 className="text-4xl font-bold mb-6">Welcome to Loryx</h1>

        <div className="bg-zinc-900 rounded-lg p-6 mb-8">
          <p className="text-zinc-300 mb-6">Connect with friends and communities through text, voice, and video.</p>

          <div className="space-y-6">
            <div className="flex items-center">
              <div className="bg-zinc-800 p-3 rounded-full mr-4">
                <Server className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Create or Join a Server</h3>
                <p className="text-sm text-zinc-400">
                  Start by selecting a server from the left sidebar or create a new one
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-zinc-800 p-3 rounded-full mr-4">
                <MessageSquare className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Start Chatting</h3>
                <p className="text-sm text-zinc-400">Select a text channel to begin messaging with others</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-zinc-800 p-3 rounded-full mr-4">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Connect with Others</h3>
                <p className="text-sm text-zinc-400">Invite friends to your servers or join existing communities</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-zinc-500 text-sm">Select a server from the left sidebar to get started</p>
      </div>
    </div>
  )
}

