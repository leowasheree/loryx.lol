"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Upload, X, Loader2, ArrowLeft } from "lucide-react"

const formSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must be at most 30 characters" }),
  nickname: z
    .string()
    .min(3, { message: "Nickname must be at least 3 characters" })
    .max(30, { message: "Nickname must be at most 30 characters" })
    .optional()
    .or(z.literal("")),
  bio: z.string().max(200, { message: "Bio must be at most 200 characters" }).optional().or(z.literal("")),
  profile_picture: z.string().optional().or(z.literal("")),
})

type UserType = {
  id: string
  email: string
  username: string
  nickname?: string
  bio?: string
  profile_picture?: string
  is_active: boolean
}

interface ProfileFormProps {
  user: UserType
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user.username || "",
      nickname: user.nickname || "",
      bio: user.bio || "",
      profile_picture: user.profile_picture || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch("https://api.loryx.lol/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile")
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
      uploadProfilePicture(file)
    }
  }

  const uploadProfilePicture = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append("file", file)

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
          console.log("Uploaded profile picture, received URL:", fileUrl)
          form.setValue("profile_picture", fileUrl)

          toast({
            title: "Success",
            description: "Profile picture uploaded successfully",
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

      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1]

      if (!token) {
        throw new Error("Not authenticated")
      }

      xhr.open("POST", "https://api.leoo.lol/chat/upload/profile-picture")
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const clearFileInput = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Form {...form}>
      {/* Add back button */}
      <div className="mb-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/chat")}
          className="flex items-center text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={previewUrl || (user.profile_picture ? `https://api.loryx.lol/${user.profile_picture}` : "")}
                alt={user.username}
              />
              <AvatarFallback className="bg-zinc-800">
                <User className="h-8 w-8" />
              </AvatarFallback>
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
            <div className="w-full">
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

          <div>
            <h2 className="text-xl font-bold">{user.username}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} className="bg-zinc-900 border-zinc-800" />
              </FormControl>
              <FormDescription className="text-gray-400">
                This is your public display name. It must be unique.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nickname</FormLabel>
              <FormControl>
                <Input placeholder="nickname (optional)" {...field} className="bg-zinc-900 border-zinc-800" />
              </FormControl>
              <FormDescription className="text-gray-400">
                This is your display name in chats. If not set, your username will be used.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself (optional)"
                  {...field}
                  className="bg-zinc-900 border-zinc-800 resize-none h-24"
                />
              </FormControl>
              <FormDescription className="text-gray-400">
                A short bio about yourself. Max 200 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading || isUploading}>
          {isLoading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  )
}

