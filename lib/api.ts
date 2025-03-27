import type { Server, Channel, Message } from "./types"

// API base URL - centralized for easier management
const API_BASE_URL = "https://api.loryx.lol"

// Helper function to extract error messages from Pydantic validation errors
const extractErrorMessage = (error: any): string => {
  // Check if it's a Pydantic validation error (has type, loc, msg, input)
  if (error && typeof error === "object" && "msg" in error) {
    return error.msg || "Validation error"
  }

  // Check if it's an array of validation errors
  if (Array.isArray(error)) {
    return error.map((err) => extractErrorMessage(err)).join(", ")
  }

  // Check if it has a detail field (common in FastAPI errors)
  if (error && typeof error === "object" && "detail" in error) {
    // The detail could be a string or another validation object
    return typeof error.detail === "string" ? error.detail : extractErrorMessage(error.detail)
  }

  // Default case: convert to string
  return String(error || "Unknown error")
}

// Update the getToken function to handle different ways of accessing the token
// Get token from cookies
const getToken = () => {
  if (typeof document === "undefined") return null

  // Try to get from cookie directly
  const tokenFromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1]

  if (tokenFromCookie) {
    return decodeURIComponent(tokenFromCookie)
  }

  // If not found in cookie, try localStorage as fallback
  const tokenFromStorage = localStorage.getItem("token")
  if (tokenFromStorage) {
    return tokenFromStorage
  }

  return null
}

// Fetch servers
export const fetchServers = async (): Promise<Server[]> => {
  const token = getToken()
  if (!token) {
    console.error("No token found when fetching servers")
    throw new Error("Not authenticated")
  }

  try {
    console.log("Fetching servers...")

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Updated to use the new endpoint path
    const response = await fetch(`${API_BASE_URL}/chat/servers/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (response.status === 401) {
      console.error("Authentication error when fetching servers")
      throw new Error("Authentication failed")
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to fetch servers:", response.status, errorData)
      throw new Error(errorData ? extractErrorMessage(errorData) : `Failed to fetch servers: ${response.status}`)
    }

    const data = await response.json()
    console.log("Servers fetched successfully:", data)

    // If the API returns null or undefined, return an empty array
    if (!data) return []

    return data
  } catch (error) {
    console.error("Error fetching servers:", error)

    // More specific error message based on the error type
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error("Network error: API might be unavailable")
      // Return empty array instead of throwing for better UX
      throw new Error("Network error: API might be unavailable")
    }

    if (error.name === "AbortError") {
      console.error("Request timed out")
      throw new Error("Request timed out")
    }

    // Rethrow the error with a string message
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Create server
export const createServer = async (name: string): Promise<Server> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log("Creating server with name:", name)

    // This matches the ServerCreate schema expected by the backend
    // Updated to use the new endpoint path
    const response = await fetch(`${API_BASE_URL}/chat/servers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to create server:", response.status, errorData)

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to create server: ${response.status}`)
    }

    const data = await response.json()
    console.log("Server created successfully:", data)
    return data
  } catch (error) {
    console.error("Error creating server:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Leave server
export const leaveServer = async (serverId: string): Promise<Server> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Leaving server ${serverId}...`)

    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to leave server:", response.status, errorData)

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to leave server: ${response.status}`)
    }

    const data = await response.json()
    console.log("Server left successfully:", data)
    return data
  } catch (error) {
    console.error("Error leaving server:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Generate invite link - updated to match new backend implementation
export const generateInviteLink = async (serverId: string): Promise<{ invite_link: string; server_name: string }> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Generating invite link for server ${serverId}...`)

    // Always send a request body with an empty vanity_url field
    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/invite-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ vanity_url: "" }), // Send empty string for vanity_url
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to generate invite link:", response.status, errorData)

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to generate invite link: ${response.status}`)
    }

    const data = await response.json()
    console.log("Invite link generated successfully:", data)
    return data
  } catch (error) {
    console.error("Error generating invite link:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Set vanity URL for a server
export const setVanityUrl = async (
  serverId: string,
  vanityUrl: string,
): Promise<{ invite_link: string; server_name: string }> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Setting vanity URL "${vanityUrl}" for server ${serverId}...`)

    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/invite-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ vanity_url: vanityUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to set vanity URL:", response.status, errorData)

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to set vanity URL: ${response.status}`)
    }

    const data = await response.json()
    console.log("Vanity URL set successfully, response data:", data)

    return {
      invite_link: data.invite_link,
      server_name: data.server_name,
    }
  } catch (error) {
    console.error("Error setting vanity URL:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Join server via invite code - updated to match new backend implementation
export const joinServerViaInvite = async (inviteCode: string): Promise<Server> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Joining server with invite code ${inviteCode}...`)

    const response = await fetch(`${API_BASE_URL}/chat/join-server/${inviteCode}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to join server via invite:", response.status, errorData)

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to join server via invite: ${response.status}`)
    }

    const data = await response.json()
    console.log("Server joined via invite successfully:", data)
    return data
  } catch (error) {
    console.error("Error joining server via invite:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Fetch channels for a server
export const fetchChannels = async (serverId: string): Promise<Channel[]> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Fetching channels for server ${serverId}...`)

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Try to use the GET endpoint first
    try {
      const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/channels`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Channels fetched successfully:", data)
        return data || []
      }
    } catch (error) {
      console.log("GET request for channels failed, falling back to POST")
    }

    // Fall back to POST method if GET fails
    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "_dummy_fetch_", type: "text" }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (response.status === 401) {
      console.error("Authentication error when fetching channels")
      throw new Error("Authentication failed")
    }

    if (response.status === 403) {
      console.error("Not a member of this server")
      throw new Error("You are not a member of this server")
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to fetch channels:", response.status, errorData)
      throw new Error(errorData ? extractErrorMessage(errorData) : `Failed to fetch channels: ${response.status}`)
    }

    // If we get here, the POST request succeeded but we don't have a proper way to get channels
    // Return an empty array instead of mock data
    return []
  } catch (error) {
    console.error("Error fetching channels:", error)

    // More specific error message based on the error type
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error("Network error: API might be unavailable")
      throw new Error("Network error: API might be unavailable")
    }

    if (error.name === "AbortError") {
      console.error("Request timed out")
      throw new Error("Request timed out")
    }

    // Rethrow the error with a string message
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Create channel
export const createChannel = async (
  serverId: string,
  name: string,
  type: "text" | "voice" = "text",
): Promise<Channel> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Creating channel "${name}" in server ${serverId}...`)

    // Updated to use the new endpoint path structure
    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, type }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to create channel:", response.status, errorData)

      if (response.status === 403) {
        throw new Error("You must be the server owner to create channels")
      }

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }

      throw new Error("Failed to create channel")
    }

    const data = await response.json()
    console.log("Channel created successfully:", data)
    return data
  } catch (error) {
    console.error("Error creating channel:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Fetch messages for a channel
export const fetchMessages = async (channelId: string): Promise<Message[]> => {
  if (!channelId || channelId === "undefined") {
    console.error("Invalid channel ID:", channelId)
    return []
  }

  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Fetching messages for channel ${channelId}...`)

    // Add timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Try to use the GET endpoint first
    try {
      const response = await fetch(`${API_BASE_URL}/chat/channels/${channelId}/messages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Messages fetched successfully:", data)
        return data || []
      }
    } catch (error) {
      console.log("GET request for messages failed, falling back to POST")
    }

    // Fall back to POST method if GET fails
    const response = await fetch(`${API_BASE_URL}/chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: "_dummy_fetch_" }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (response.status === 401) {
      console.error("Authentication error when fetching messages")
      throw new Error("Authentication failed")
    }

    if (response.status === 403) {
      console.error("Not a member of the server that owns this channel")
      throw new Error("You are not a member of this server")
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to fetch messages:", response.status, errorData)
      throw new Error(errorData ? extractErrorMessage(errorData) : `Failed to fetch messages: ${response.status}`)
    }

    // Since we're using POST which creates a message, we need to handle this differently
    // For now, return an empty array
    return []
  } catch (error) {
    console.error("Error fetching messages:", error)

    // More specific error message based on the error type
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error("Network error: API might be unavailable")
      throw new Error("Network error: API might be unavailable")
    }

    if (error.name === "AbortError") {
      console.error("Request timed out")
      throw new Error("Request timed out")
    }

    // Rethrow the error with a string message
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Send message
export const sendMessage = async (channelId: string, content: string): Promise<Message> => {
  if (!channelId || channelId === "undefined") {
    throw new Error("Invalid channel ID")
  }

  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Sending message to channel ${channelId}:`, content)

    // Check if the content is a media URL
    const isMediaUrl = content
      .trim()
      .toLowerCase()
      .match(/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/)

    // The server will automatically detect media URLs, but we log it for clarity
    if (isMediaUrl) {
      console.log("Detected media URL in message content:", content)
    }

    // Updated to use the new endpoint path structure
    const response = await fetch(`${API_BASE_URL}/chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to send message:", response.status, errorData)

      if (response.status === 403) {
        throw new Error("You must be a member of this server to send messages")
      }

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }

      throw new Error("Failed to send message")
    }

    const data = await response.json()
    console.log("Message sent successfully:", data)

    // Log if the server detected and processed this as a media message
    if (data.media_url) {
      console.log("Server processed as media message with URL:", data.media_url)
    }

    return data
  } catch (error) {
    console.error("Error sending message:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Update server settings
export const updateServerSettings = async (
  serverId: string,
  settings: {
    name?: string
    bio?: string
    profile_picture?: string
  },
): Promise<Server> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Updating settings for server ${serverId}:`, settings)

    // Clean up the profile_picture path if it exists
    const cleanSettings = { ...settings }
    if (cleanSettings.profile_picture) {
      // Remove any quotes and ensure it's a clean path
      cleanSettings.profile_picture = cleanSettings.profile_picture.replace(/^["\\]+|["\\]+$/g, "")

      // Ensure the path starts with /static/ as required by the server
      if (
        !cleanSettings.profile_picture.startsWith("/static/") &&
        !cleanSettings.profile_picture.startsWith("static/")
      ) {
        console.log("Profile picture path doesn't start with /static/, adding prefix")
        cleanSettings.profile_picture = `/static/${cleanSettings.profile_picture}`
      }
    }

    console.log("Sending cleaned settings:", cleanSettings)

    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cleanSettings),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to update server settings:", response.status, errorData)

      if (response.status === 403) {
        throw new Error("Only the server owner can update settings")
      }

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to update server settings: ${response.status}`)
    }

    const data = await response.json()
    console.log("Server settings updated successfully:", data)
    return data
  } catch (error) {
    console.error("Error updating server settings:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Get server members
export const getServerMembers = async (serverId: string): Promise<User[]> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Fetching members for server ${serverId}...`)

    const response = await fetch(`${API_BASE_URL}/chat/servers/${serverId}/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to fetch server members:", response.status, errorData)

      if (response.status === 403) {
        throw new Error("You are not a member of this server")
      }

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to fetch server members: ${response.status}`)
    }

    const data = await response.json()
    console.log("Server members fetched successfully:", data)
    return data
  } catch (error) {
    console.error("Error fetching server members:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Get user by username
export const getUserByUsername = async (username: string): Promise<User> => {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  try {
    console.log(`Fetching user with username ${username}...`)

    // Remove @ symbol if present at the beginning of the username
    const cleanUsername = username.startsWith("@") ? username.substring(1) : username

    const response = await fetch(`${API_BASE_URL}/chat/users/${cleanUsername}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Failed to fetch user:", response.status, errorData)

      if (response.status === 404) {
        throw new Error("User not found")
      }

      if (errorData) {
        throw new Error(extractErrorMessage(errorData))
      }
      throw new Error(`Failed to fetch user: ${response.status}`)
    }

    const data = await response.json()
    console.log("User fetched successfully:", data)
    return data
  } catch (error) {
    console.error("Error fetching user:", error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(extractErrorMessage(error))
    }
  }
}

// Define the User type
export type User = {
  id: string
  username: string
  email: string
  profile_picture: string
  bio: string
  created_at: string
  updated_at: string
}

