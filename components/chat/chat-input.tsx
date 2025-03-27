"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smile, Send, X, Loader2, Image } from "lucide-react"
import type { Channel, Server } from "@/lib/types"
import { useWebSocket } from "@/hooks/use-websocket"
import { useToast } from "@/hooks/use-toast"
import { fetchChannels } from "@/lib/api"
import { getServerMembers } from "@/lib/api"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatInputProps {
  channel: Channel | null
  server?: Server | null
}

// Emoji categories and emojis
const emojiCategories = [
  {
    name: "Smileys & Emotion",
    emojis: [
      { name: "smile", emoji: "😊" },
      { name: "laugh", emoji: "😂" },
      { name: "wink", emoji: "😉" },
      { name: "heart_eyes", emoji: "😍" },
      { name: "joy", emoji: "😂" },
      { name: "rofl", emoji: "🤣" },
      { name: "smirk", emoji: "😏" },
      { name: "thinking", emoji: "🤔" },
      { name: "unamused", emoji: "😒" },
      { name: "sweat", emoji: "😓" },
      { name: "weary", emoji: "😩" },
      { name: "sob", emoji: "😭" },
      { name: "angry", emoji: "😡" },
      { name: "exploding_head", emoji: "🤯" },
    ],
  },
  {
    name: "Gestures & People",
    emojis: [
      { name: "thumbsup", emoji: "👍" },
      { name: "thumbsdown", emoji: "👎" },
      { name: "ok", emoji: "👌" },
      { name: "clap", emoji: "👏" },
      { name: "wave", emoji: "👋" },
      { name: "pray", emoji: "🙏" },
      { name: "shrug", emoji: "🤷" },
      { name: "facepalm", emoji: "🤦" },
    ],
  },
  {
    name: "Objects & Symbols",
    emojis: [
      { name: "heart", emoji: "❤️" },
      { name: "fire", emoji: "🔥" },
      { name: "rocket", emoji: "🚀" },
      { name: "tada", emoji: "🎉" },
      { name: "check", emoji: "✅" },
      { name: "x", emoji: "❌" },
      { name: "star", emoji: "⭐" },
      { name: "sparkles", emoji: "✨" },
      { name: "zap", emoji: "⚡" },
      { name: "boom", emoji: "💥" },
      { name: "question", emoji: "❓" },
      { name: "exclamation", emoji: "❗" },
      { name: "warning", emoji: "⚠️" },
      { name: "100", emoji: "💯" },
    ],
  },
  {
    name: "Animals & Nature",
    emojis: [
      { name: "bug", emoji: "🐛" },
      { name: "ghost", emoji: "👻" },
      { name: "alien", emoji: "👽" },
      { name: "robot", emoji: "🤖" },
      { name: "rainbow", emoji: "🌈" },
      { name: "unicorn", emoji: "🦄" },
    ],
  },
]

export function ChatInput({ channel, server }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const { sendMessage, isConnected } = useWebSocket(channel ? channel.id : null)
  const { toast } = useToast()
  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [mentionType, setMentionType] = useState<"user" | "channel" | null>(null)
  const [mentionResults, setMentionResults] = useState<Array<{ id: string; name: string }>>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const mentionBoxRef = useRef<HTMLDivElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!channel) {
      toast({
        title: "Error",
        description: "No channel selected",
        variant: "destructive",
      })
      return
    }

    if (!isConnected) {
      toast({
        title: "Error",
        description: "Not connected to chat",
        variant: "destructive",
      })
      return
    }

    try {
      if (selectedFile) {
        await uploadMedia(selectedFile)
      } else if (message.trim()) {
        sendMessage(message.trim())
        setMessage("")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const getToken = () => {
    const tokenFromCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]

    if (tokenFromCookie) {
      return decodeURIComponent(tokenFromCookie)
    }

    const tokenFromStorage = localStorage.getItem("token")
    if (tokenFromStorage) {
      return tokenFromStorage
    }

    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMessage(newValue)

    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)

    const textBeforeCursor = newValue.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)(@|#)([a-zA-Z0-9._]*)$/)

    if (mentionMatch) {
      const triggerChar = mentionMatch[1]
      const searchTerm = mentionMatch[2]
      setMentionSearch(searchTerm)
      setMentionType(triggerChar === "@" ? "user" : "channel")
    } else {
      setMentionSearch(null)
      setMentionType(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (mentionSearch !== null) {
        setMentionSearch(null)
        setMentionType(null)
        return
      }
      if (showPreview) {
        setShowPreview(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (mentionSearch !== null && mentionResults.length > 0) {
        e.preventDefault()
        insertMention(mentionResults[0])
        return
      }

      if (!isUploading) {
        e.preventDefault()
        handleSubmit(e)
      }
    }

    if (mentionSearch !== null && mentionResults.length > 0 && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault()
    }
  }

  const insertMention = (item: { id: string; name: string }) => {
    if (!inputRef.current) return

    const textBeforeCursor = message.substring(0, cursorPosition)
    const textAfterCursor = message.substring(cursorPosition)

    const mentionStartMatch = textBeforeCursor.match(/(?:^|\s)(@|#)([a-zA-Z0-9._]*)$/)

    if (mentionStartMatch) {
      const startPos = mentionStartMatch.index! + (mentionStartMatch[0].startsWith(" ") ? 1 : 0)
      const prefix = message.substring(0, startPos)
      const mentionText = mentionType === "user" ? `@${item.name}` : `#${item.name}`

      const newMessage = `${prefix}${mentionText} ${textAfterCursor}`
      setMessage(newMessage)

      setMentionSearch(null)
      setMentionType(null)

      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = prefix.length + mentionText.length + 1
          inputRef.current.selectionStart = newCursorPos
          inputRef.current.selectionEnd = newCursorPos
          inputRef.current.focus()
        }
      }, 0)
    }
  }

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return

    const cursorPos = inputRef.current.selectionStart || 0
    const textBeforeCursor = message.substring(0, cursorPos)
    const textAfterCursor = message.substring(cursorPos)

    const newMessage = `${textBeforeCursor}${emoji}${textAfterCursor}`
    setMessage(newMessage)

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = cursorPos + emoji.length
        inputRef.current.selectionStart = newCursorPos
        inputRef.current.selectionEnd = newCursorPos
        inputRef.current.focus()
      }
    }, 0)
  }

  useEffect(() => {
    const fetchMentionResults = async () => {
      if ((!mentionSearch !== null && !mentionType) || !server) return

      try {
        if (mentionType === "user") {
          const members = await getServerMembers(server!.id)
          const filteredMembers = members
            .filter((member) => member.username.toLowerCase().includes(mentionSearch?.toLowerCase() || ""))
            .map((member) => ({
              id: member.id,
              name: member.username,
            }))
          setMentionResults(filteredMembers.slice(0, 5))
        } else if (mentionType === "channel") {
          const channels = await fetchChannels(server!.id)
          const filteredChannels = channels
            .filter((channel) => channel.name.toLowerCase().includes(mentionSearch?.toLowerCase() || ""))
            .map((channel) => ({
              id: channel.id,
              name: channel.name,
            }))
          setMentionResults(filteredChannels.slice(0, 5))
        }
      } catch (error) {
        console.error("Error fetching mention results:", error)
        setMentionResults([])
      }
    }

    if (mentionSearch !== null && server) {
      fetchMentionResults()
    } else {
      setMentionResults([])
    }
  }, [mentionSearch, mentionType, server])

  const formatMessageWithMentions = (text: string) => {
    const userMentionRegex = /@([a-zA-Z0-9._]+)/g
    const channelMentionRegex = /#([a-zA-Z0-9._-]+)/g

    let formattedParts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = userMentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        formattedParts.push(text.substring(lastIndex, match.index))
      }

      formattedParts.push(
        <span key={`user-${match.index}`} className="bg-blue-500/20 text-blue-400 rounded px-1">
          @{match[1]}
        </span>,
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)

      let channelLastIndex = 0
      const channelParts: React.ReactNode[] = []

      while ((match = channelMentionRegex.exec(remainingText)) !== null) {
        if (match.index > channelLastIndex) {
          channelParts.push(remainingText.substring(channelLastIndex, match.index))
        }

        channelParts.push(
          <span key={`channel-${match.index}`} className="bg-green-500/20 text-green-400 rounded px-1">
            #{match[1]}
          </span>,
        )

        channelLastIndex = match.index + match[0].length
      }

      if (channelLastIndex < remainingText.length) {
        channelParts.push(remainingText.substring(channelLastIndex))
      }

      formattedParts = [...formattedParts, ...channelParts]
    }

    return formattedParts.length > 0 ? formattedParts : text
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size exceeds 5MB limit",
          variant: "destructive",
        })
        return
      }

      const fileType = file.type.split("/")[0]
      if (fileType !== "image" && fileType !== "video") {
        toast({
          title: "Error",
          description: "Only images and videos are supported",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setShowPreview(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (!channel) {
    return null
  }

  const uploadMedia = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("channel_id", channel.id)

      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // The server returns the full URL directly
          const mediaUrl = xhr.responseText.replace(/^["\\]+|["\\]+$/g, "")
          console.log("Uploaded media, received URL:", mediaUrl)

          // Simply send the media URL as the message content
          // The server will detect it's a media URL based on the extension
          const success = sendMessage(mediaUrl)

          if (success) {
            console.log("Media message sent successfully with URL:", mediaUrl)
            setSelectedFile(null)
            setPreviewUrl(null)
            setShowPreview(false)
            setMessage("")
          } else {
            console.error("Failed to send media message")
            toast({
              title: "Error",
              description: "Failed to send media message",
              variant: "destructive",
            })
          }
        } else {
          console.error("Upload failed with status:", xhr.status)
          console.error("Response text:", xhr.responseText)
          throw new Error(`Upload failed with status ${xhr.status}`)
        }
        setIsUploading(false)
      })

      xhr.addEventListener("error", (e) => {
        console.error("XHR error during upload:", e)
        setIsUploading(false)
        throw new Error("Network error during upload")
      })

      xhr.addEventListener("abort", () => {
        setIsUploading(false)
      })

      const token = getToken()
      if (!token) {
        throw new Error("Not authenticated")
      }

      console.log("Sending upload request to: https://api.leoo.lol/chat/upload/chat-media")
      xhr.open("POST", "https://api.loryx.lol/chat/upload/chat-media")
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading media:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload media",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-900 relative">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {showPreview && previewUrl && (
          <div className="mb-3 relative">
            <div className="relative inline-block max-w-xs">
              {selectedFile?.type.startsWith("image/") ? (
                <img src={previewUrl || "/placeholder.svg"} alt="Upload preview" className="max-h-40 rounded-md" />
              ) : (
                <video src={previewUrl} className="max-h-40 rounded-md" controls />
              )}
              <button
                type="button"
                onClick={clearSelectedFile}
                className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 hover:bg-zinc-700 shadow-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="mb-3">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm text-zinc-400">Uploading... {uploadProgress}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 mt-1 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*, video/*"
            className="hidden"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload media"
          >
            <Image className="h-5 w-5" />
          </Button>

          <div className="flex-1 mx-2 relative">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${channel.name}`}
                className="w-full rounded-md bg-zinc-800 border-none focus:ring-0 focus:outline-none py-2 px-4 text-white"
                disabled={!isConnected || isUploading}
              />

              {message && showPreview && (
                <div className="absolute left-0 right-0 bottom-full mb-1 p-2 bg-zinc-800 rounded border border-zinc-700 text-sm">
                  <div className="text-xs text-zinc-400 mb-1">Preview:</div>
                  <div>{formatMessageWithMentions(message)}</div>
                </div>
              )}

              {mentionSearch !== null && mentionResults.length > 0 && (
                <div
                  ref={mentionBoxRef}
                  className="absolute left-0 bottom-full mb-1 w-64 bg-zinc-800 rounded border border-zinc-700 shadow-lg z-10"
                >
                  <div className="p-2 border-b border-zinc-700 text-xs text-zinc-400">
                    {mentionType === "user" ? "Users" : "Channels"}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {mentionResults.map((result) => (
                      <div
                        key={result.id}
                        className="px-3 py-2 hover:bg-zinc-700 cursor-pointer flex items-center"
                        onClick={() => insertMention(result)}
                      >
                        {mentionType === "user" ? (
                          <span className="text-blue-400">@{result.name}</span>
                        ) : (
                          <span className="text-green-400">#{result.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                disabled={isUploading}
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-zinc-800 border-zinc-700">
              <div className="p-2 border-b border-zinc-700">
                <div className="text-sm font-medium">Emojis</div>
              </div>
              <ScrollArea className="h-64">
                <div className="p-3">
                  {emojiCategories.map((category) => (
                    <div key={category.name} className="mb-4">
                      <h3 className="text-xs font-medium text-zinc-400 mb-2">{category.name}</h3>
                      <div className="grid grid-cols-8 gap-1">
                        {category.emojis.map((emojiData) => (
                          <button
                            key={emojiData.name}
                            type="button"
                            onClick={() => insertEmoji(emojiData.emoji)}
                            className="text-xl hover:bg-zinc-700 rounded p-1 transition-colors"
                            title={`:${emojiData.name}:`}
                          >
                            {emojiData.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={(!message.trim() && !selectedFile) || !isConnected || isUploading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}

