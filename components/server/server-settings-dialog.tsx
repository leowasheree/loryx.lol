"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload, X, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { updateServerSettings } from "@/lib/api"
import type { Server } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ServerSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: Server
  onServerUpdated: (updatedServer: Server) => void
}

export function ServerSettingsDialog({ open, onOpenChange, server, onServerUpdated }: ServerSettingsDialogProps) {
  const [name, setName] = useState(server.name || "")
  const [bio, setBio] = useState(server.bio || "")
  const [profilePicture, setProfilePicture] = useState(server.profile_picture || "")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Reset form when server changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(server.name || "")
      setBio(server.bio || "")
      setProfilePicture(server.profile_picture || "")
      setPreviewUrl(null)
      setError(null)
    }
  }, [open, server])

  const validateServerName = (name: string): boolean => {
    if (!name.trim()) {
      setError("Server name is required")
      return false
    }

    if (name.trim().length < 3) {
      setError("Server name must be at least 3 characters")
      return false
    }

    return true
  }

  const handleUpdateSettings = async () => {
    setError(null)

    if (!validateServerName(name)) return

    setIsSubmitting(true)

    try {
      console.log("Updating server with profile picture:", profilePicture)

      const updatedServer = await updateServerSettings(server.id, {
        name: name.trim(),
        bio: bio.trim(),
        profile_picture: profilePicture || undefined,
      })

      onServerUpdated(updatedServer)

      toast({
        title: "Server updated",
        description: "Server settings have been updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating server settings:", error)
      setError(error instanceof Error ? error.message : "Failed to update server settings")

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update server settings",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size (1MB max)
      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size exceeds 1MB limit",
          variant: "destructive",
        })
        return
      }

      // Check file type
      const fileType = file.type.split("/")[0]
      if (fileType !== "image") {
        toast({
          title: "Error",
          description: "Only images are supported",
          variant: "destructive",
        })
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload the file
      uploadServerPicture(file)
    }
  }

  const uploadServerPicture = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("server_id", server.id)

      // Upload the file with progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Clean the response to remove any quotes
          const fileUrl = xhr.responseText.replace(/^["\\]+|["\\]+$/g, "")
          console.log("Uploaded server picture, received URL:", fileUrl)

          // Ensure the path starts with /static/ as required by the server
          let formattedPath = fileUrl
          if (!formattedPath.startsWith("/static/") && !formattedPath.startsWith("static/")) {
            formattedPath = `/static/${fileUrl}`
          }

          setProfilePicture(formattedPath)

          toast({
            title: "Success",
            description: "Server picture uploaded successfully",
          })
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`)
        }
        setIsUploading(false)
      })

      xhr.addEventListener("error", () => {
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

      xhr.open("POST", "https://api.loryx.lol/chat/upload/server-picture")
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading server picture:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload server picture",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const getToken = () => {
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

  const clearFileInput = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Function to get the full image URL for display
  const getServerImageUrl = (path: string | null | undefined): string => {
    if (!path) return ""
    return `https://api.leoo.lol/${path}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Customize your server's appearance and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center mb-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 mb-2">
                <AvatarImage src={previewUrl || getServerImageUrl(profilePicture)} alt={name} />
                <AvatarFallback className="bg-zinc-800 text-xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={clearFileInput}
                  className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 hover:bg-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="w-full mt-2">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-xs text-zinc-400">Uploading... {uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              placeholder="Enter server name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-bio">Server Description</Label>
            <Textarea
              id="server-bio"
              placeholder="Tell others what this server is about"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-zinc-800 border-zinc-700 resize-none h-24"
            />
            <p className="text-xs text-zinc-400">A brief description of your server's purpose or community.</p>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button onClick={handleUpdateSettings} disabled={isSubmitting || isUploading} className="flex-1">
              {isSubmitting ? "Updating..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-zinc-800 border-zinc-700"
              disabled={isSubmitting || isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

