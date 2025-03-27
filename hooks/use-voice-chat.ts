"use client"

import { useState } from "react"

export function useVoiceChat(channelId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>("Voice chat is not implemented in this version")
  const [memberCount, setMemberCount] = useState(0)
  const [participants, setParticipants] = useState<any[]>([])

  return {
    isConnected,
    error,
    memberCount,
    participants,
    isMuted: true,
    isDeafened: true,
    audioLevel: 0,
    inputDevices: [],
    outputDevices: [],
    selectedInputDevice: null,
    selectedOutputDevice: null,
    isDebugMode: false,
    debugLogs: [],
    toggleMute: () => {},
    toggleDeafen: () => {},
    changeInputDevice: () => {},
    changeOutputDevice: () => {},
    toggleDebugMode: () => {},
    enumerateDevices: () => {},
  }
}

