export type User = {
  id: string
  username: string
  nickname?: string
  bio?: string
  profile_picture?: string
  is_active: boolean
}

export type Server = {
  id: string
  name: string
  owner: string
  member_count: number
  channel_count: number
  created_at?: string
  bio?: string
  profile_picture?: string
}

export type Channel = {
  id: string
  name: string
  server_id?: string
  type: "text" | "voice"
  member_count?: number
  participants?: {
    id: string
    username: string
    nickname?: string
    profile_picture?: string
  }[]
}

export type Message = {
  id: string
  content: string
  timestamp: string
  author_nickname: string
  author_username?: string
  author_profile_picture?: string
  author_is_active?: boolean
  type?: string
  media_url?: string
  media?: string | string[] // Can be either string (old format) or string[] (new format)
  media_array?: string[] // New format where media is an array
  mentions?: string[] // usernames that are mentioned
  mentioned_channels?: string[] // channel names that are mentioned
}

export type InviteLink = {
  invite_link: string
  server_name: string
}

