"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { Message, Channel, User } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWebSocket } from "@/hooks/use-websocket"
import { fetchMessages } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format, isToday, isYesterday } from "date-fns"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { UserCard } from "@/components/user/user-card"
import { ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatMessagesProps {
  channel: Channel | null
  currentUser?: User | null
}

// Helper function to format timestamps
const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`
  } else {
    return `${format(date, "dd.MM.yyyy")} at ${format(date, "h:mm a")}`
  }
}

// Helper to check if two messages are from the same author and within the same minute
const isSameGroup = (msg1: Message, msg2: Message): boolean => {
  if (msg1.author_nickname !== msg2.author_nickname) return false

  const date1 = new Date(msg1.timestamp)
  const date2 = new Date(msg2.timestamp)

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate() &&
    date1.getHours() === date2.getHours() &&
    date1.getMinutes() === date2.getMinutes()
  )
}

// Helper function to format message content with mentions
const formatMessageContent = (content: string, currentUsername?: string): React.ReactNode => {
  // Don't try to format media URLs as messages
  if (isMediaUrl(content)) {
    return null
  }

  // Match @username and #channel-name patterns
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  // Regular expressions for mentions
  const userMentionRegex = /@([a-zA-Z0-9._]+)/g
  const channelMentionRegex = /#([a-zA-Z0-9._-]+)/g
  const emojiRegex = /(:([a-zA-Z0-9_+-]+):)/g

  // Process user mentions
  let match
  while ((match = userMentionRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    // Check if this is a mention of the current user
    const isSelfMention = currentUsername && match[1].toLowerCase() === currentUsername.toLowerCase()

    // Add the highlighted mention
    parts.push(
      <span
        key={`user-${match.index}`}
        className={`${isSelfMention ? "bg-blue-500/40 text-blue-300" : "bg-blue-500/20 text-blue-400"} rounded px-1`}
      >
        @{match[1]}
      </span>,
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text and process channel mentions
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex)
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

    // Process emojis in the remaining text
    const emojiText = channelLastIndex < remainingText.length ? remainingText.substring(channelLastIndex) : ""
    let emojiLastIndex = 0
    const emojiParts: React.ReactNode[] = []

    while ((match = emojiRegex.exec(emojiText)) !== null) {
      if (match.index > emojiLastIndex) {
        emojiParts.push(emojiText.substring(emojiLastIndex, match.index))
      }

      // Convert emoji code to actual emoji if possible
      const emojiName = match[2]
      const emoji = getEmojiByName(emojiName)

      emojiParts.push(
        <span key={`emoji-${match.index}`} className="text-xl inline-block align-middle">
          {emoji || match[0]}
        </span>,
      )

      emojiLastIndex = match.index + match[0].length
    }

    if (emojiLastIndex < emojiText.length) {
      emojiParts.push(emojiText.substring(emojiLastIndex))
    }

    if (emojiParts.length > 0) {
      channelParts.push(...emojiParts)
    } else if (channelLastIndex < remainingText.length) {
      channelParts.push(remainingText.substring(channelLastIndex))
    }

    parts.push(...channelParts)
  }

  return parts.length > 0 ? <>{parts}</> : content
}

// Helper function to get emoji by name
const getEmojiByName = (name: string): string | null => {
  const emojiMap: Record<string, string> = {
    smile: "😊",
    laugh: "😂",
    wink: "😉",
    heart: "❤️",
    thumbsup: "👍",
    thumbsdown: "👎",
    clap: "👏",
    fire: "🔥",
    rocket: "🚀",
    tada: "🎉",
    check: "✅",
    x: "❌",
    thinking: "🤔",
    eyes: "👀",
    sob: "😭",
    angry: "😡",
    cool: "😎",
    party: "🥳",
    shrug: "🤷",
    facepalm: "🤦",
    pray: "🙏",
    ok: "👌",
    wave: "👋",
    plus1: "👍",
    minus1: "👎",
    joy: "😂",
    sunglasses: "😎",
    heart_eyes: "😍",
    sweat_smile: "😅",
    rofl: "🤣",
    smirk: "😏",
    unamused: "😒",
    sweat: "😓",
    weary: "😩",
    exploding_head: "🤯",
    star: "⭐",
    sparkles: "✨",
    zap: "⚡",
    boom: "💥",
    question: "❓",
    exclamation: "❗",
    warning: "⚠️",
    bug: "🐛",
    poop: "💩",
    ghost: "👻",
    alien: "👽",
    robot: "🤖",
    rainbow: "🌈",
    unicorn: "🦄",
    "100": "💯",
  }

  return emojiMap[name] || null
}

// Check if a message mentions the current user
const isUserMentioned = (message: Message, currentUsername?: string): boolean => {
  if (!currentUsername || !message.content) return false

  const mentionRegex = new RegExp(`@${currentUsername}\\b`, "i")
  return mentionRegex.test(message.content)
}

// Check if a string is a media URL
const isMediaUrl = (url: string): boolean => {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i.test(url.trim())
}

// Helper to get the media URL from a message
const getMediaUrl = (message: Message): string | null => {
  // First check if the message has a dedicated media_url field
  if (message.media_url) {
    return message.media_url
  }

  // Then check if the content itself is a media URL
  const content = message.content || ""
  if (isMediaUrl(content)) {
    return content
  }

  // Finally check for media field (could be string or array)
  if (message.media) {
    if (Array.isArray(message.media) && message.media.length > 0) {
      return message.media[0]
    } else if (typeof message.media === "string") {
      return message.media
    }
  }

  return null
}

// Get full media URL with proper domain
const getFullMediaUrl = (url: string): string => {
  if (!url) return ""

  // If it's already a full URL, return it
  if (url.startsWith("http")) {
    return url
  }

  // Otherwise, prepend the API base URL
  return `https://api.loryx.lol${url.startsWith("/") ? "" : "/"}${url}`
}

export function ChatMessages({ channel, currentUser }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { messages: wsMessages, isConnected, error } = useWebSocket(channel ? channel.id : null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [showMediaPreview, setShowMediaPreview] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load initial messages when channel changes
  useEffect(() => {
    if (!channel) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        console.log(`Loading messages for channel ${channel.id}`)
        const messageList = await fetchMessages(channel.id)
        setMessages(messageList || [])
      } catch (err) {
        console.error("Error loading messages:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load messages"
        setLoadError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        // Set empty array to prevent undefined errors
        setMessages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [channel, toast])

  // Add WebSocket messages to the list with deduplication
  useEffect(() => {
    if (wsMessages.length > 0) {
      setMessages((prev) => {
        // Create a map of existing message IDs for quick lookup
        const existingIds = new Map(prev.map((msg) => [msg.id, true]))

        // Filter out any new messages that already exist in the current messages
        const uniqueNewMessages = wsMessages.filter((msg) => !existingIds.has(msg.id))

        if (uniqueNewMessages.length === 0) {
          return prev // No new unique messages to add
        }

        // Check for mentions of the current user
        uniqueNewMessages.forEach((message) => {
          if (isUserMentioned(message, currentUser?.username)) {
            toast({
              title: "Mention",
              description: `${message.author_nickname} mentioned you in #${channel?.name}`,
            })
          }
        })

        return [...prev, ...uniqueNewMessages]
      })
    }
  }, [wsMessages, channel, currentUser, toast])

  // Handle scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Function to check if user is scrolled near bottom
    const isNearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      return scrollHeight - scrollTop - clientHeight < 100
    }

    // Set up scroll listener to detect when user manually scrolls up
    const handleScroll = () => {
      setAutoScroll(isNearBottom())
    }

    container.addEventListener("scroll", handleScroll)

    // Scroll to bottom if autoScroll is enabled
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [messages, autoScroll])

  // Handle user click to show profile
  const handleUserClick = (authorNickname: string) => {
    // Find the user in the messages
    const message = messages.find((msg) => msg.author_nickname === authorNickname)
    if (message) {
      setSelectedUser({
        id: message.id, // Using message ID as a fallback
        username: message.author_username || authorNickname,
        nickname: authorNickname,
        profile_picture: message.author_profile_picture,
        is_active: message.author_is_active || false,
        bio: "", // We don't have this info from messages
      })
      setShowUserProfile(true)
    }
  }

  // Handle media click to show preview
  const handleMediaClick = (mediaUrl: string) => {
    setSelectedMedia(mediaUrl)
    setShowMediaPreview(true)
  }

  // Open original media in a new tab
  const openOriginalMedia = (mediaUrl: string) => {
    window.open(mediaUrl, "_blank")
  }

  if (!channel) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-black flex items-center justify-center">
        <div className="text-zinc-400">Select a channel to view messages</div>
      </div>
    )
  }

  // Deduplicate messages by ID before rendering
  const uniqueMessages = Array.from(new Map(messages.map((message) => [message.id, message])).values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  // Group messages by author and time
  const groupedMessages: Message[][] = []
  let currentGroup: Message[] = []

  uniqueMessages.forEach((message, index) => {
    if (index === 0 || !isSameGroup(message, uniqueMessages[index - 1])) {
      if (currentGroup.length > 0) {
        groupedMessages.push(currentGroup)
      }
      currentGroup = [message]
    } else {
      currentGroup.push(message)
    }
  })

  if (currentGroup.length > 0) {
    groupedMessages.push(currentGroup)
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-black"
      style={{ paddingBottom: "1rem" }} // Add extra padding at the bottom to prevent overlap
    >
      {!autoScroll && (
        <div className="sticky top-2 z-10 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="bg-zinc-800 hover:bg-zinc-700 text-xs py-1 px-3 rounded-full shadow-lg"
            onClick={() => {
              setAutoScroll(true)
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            Scroll to bottom
          </Button>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <img
              src="/images/calyx-logo-transparent.png"
              alt="Loryx Logo"
              className="h-16 w-auto mx-auto mb-4 animate-pulse"
            />
            <div className="text-zinc-400">Loading messages...</div>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <div className="mb-2">Error loading messages</div>
            <div className="text-sm">{loadError}</div>
          </div>
        </div>
      ) : uniqueMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-zinc-400">
            <div className="mb-2">No messages yet</div>
            <div className="text-sm">Be the first to send a message!</div>
          </div>
        </div>
      ) : (
        groupedMessages.map((group, groupIndex) => {
          const firstMessage = group[0]
          const isMentioned = isUserMentioned(firstMessage, currentUser?.username)

          return (
            <div
              key={`group-${groupIndex}`}
              className={`flex items-start ${isMentioned ? "bg-blue-500/10 p-2 rounded-md -mx-2" : ""}`}
            >
              <div className="relative cursor-pointer" onClick={() => handleUserClick(firstMessage.author_nickname)}>
                <Avatar className="w-10 h-10 mr-3">
                  <AvatarImage
                    src={
                      firstMessage.author_profile_picture
                        ? `https://api.loryx.lol/${firstMessage.author_profile_picture}`
                        : ""
                    }
                    alt={firstMessage.author_nickname}
                  />
                  <AvatarFallback className="bg-zinc-800">{firstMessage.author_nickname.charAt(0)}</AvatarFallback>
                </Avatar>
                {firstMessage.author_is_active !== undefined && (
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${firstMessage.author_is_active ? "bg-green-500" : "bg-zinc-500"}`}
                  ></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline">
                  <span
                    className="font-medium mr-2 cursor-pointer hover:underline"
                    onClick={() => handleUserClick(firstMessage.author_nickname)}
                  >
                    @{firstMessage.author_nickname}
                  </span>
                  <span className="text-xs text-zinc-400">{formatMessageTime(firstMessage.timestamp)}</span>
                </div>
                <div className="space-y-3">
                  {group.map((message) => {
                    const mediaUrl = getMediaUrl(message)
                    const isContentMedia = message.content && isMediaUrl(message.content)

                    return (
                      <div key={message.id}>
                        {/* Only show content if it's not a media URL or if there's no media */}
                        {message.content && !isContentMedia && (
                          <p className="text-zinc-300 break-words">
                            {formatMessageContent(message.content, currentUser?.username)}
                          </p>
                        )}

                        {/* Media content */}
                        {mediaUrl && (
                          <div className="mt-2 relative group">
                            <div className="max-w-md overflow-hidden rounded-md">
                              {(() => {
                                // Use the URL directly if it's already a full URL
                                const fullMediaUrl = getFullMediaUrl(mediaUrl)

                                // Determine if it's an image or video based on extension
                                const isVideo = /\.(mp4|mov|avi)$/i.test(fullMediaUrl)
                                const isGif = /\.gif$/i.test(fullMediaUrl)

                                return isVideo ? (
                                  <video
                                    src={fullMediaUrl}
                                    controls
                                    className="rounded-md max-h-80 w-auto object-contain cursor-pointer"
                                    onClick={() => handleMediaClick(fullMediaUrl)}
                                  />
                                ) : (
                                  <img
                                    src={fullMediaUrl || "/placeholder.svg"}
                                    alt="Shared media"
                                    className="rounded-md max-h-80 w-auto object-contain cursor-pointer"
                                    onClick={() => handleMediaClick(fullMediaUrl)}
                                    onError={(e) => {
                                      console.error("Image failed to load:", fullMediaUrl)
                                      e.currentTarget.src = "/placeholder.svg"
                                      e.currentTarget.onerror = null // Prevent infinite loop
                                    }}
                                  />
                                )
                              })()}
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0 rounded-full bg-black/50 hover:bg-black/70"
                                onClick={() => handleMediaClick(getFullMediaUrl(mediaUrl))}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })
      )}
      <div ref={messagesEndRef} className="h-4" /> {/* Add extra space at the bottom */}
      {/* User profile dialog */}
      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          {selectedUser && <UserCard user={selectedUser} />}
        </DialogContent>
      </Dialog>
      {/* Media preview dialog */}
      <Dialog open={showMediaPreview} onOpenChange={setShowMediaPreview}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl p-0 overflow-hidden">
          {selectedMedia && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={() => openOriginalMedia(selectedMedia)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={() => setShowMediaPreview(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-center bg-zinc-950 min-h-[200px]">
                {selectedMedia.match(/\.(mp4|mov|avi)$/i) ? (
                  <video src={selectedMedia} controls className="max-h-[80vh] max-w-full object-contain" autoPlay />
                ) : (
                  <img
                    src={selectedMedia || "/placeholder.svg"}
                    alt="Media preview"
                    className="max-h-[80vh] max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

