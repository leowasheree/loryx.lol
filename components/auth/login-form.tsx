"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useStatus } from "@/components/status-provider"

// Declare Turnstile type
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string
      reset: (widgetId: string) => void
    }
  }
}

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { setUserId } = useStatus()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Initialize Turnstile when component mounts
  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(script)
      }
    }

    // Initialize Turnstile when script is loaded
    const initTurnstile = () => {
      if (window.turnstile && turnstileRef.current) {
        const widgetId = window.turnstile.render(turnstileRef.current, {
          sitekey: "0x4AAAAAABCwSZ7QLYpbejZ9",
          callback: (token: string) => {
            setTurnstileToken(token)
          },
          "expired-callback": () => {
            setTurnstileToken(null)
          },
        })
        setTurnstileWidgetId(widgetId)
      }
    }

    // Check if turnstile is already loaded
    if (window.turnstile) {
      initTurnstile()
    } else {
      // Otherwise wait for script to load
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkTurnstile)
          initTurnstile()
        }
      }, 100)

      return () => clearInterval(checkTurnstile)
    }
  }, [])

  // Reset Turnstile on form submission
  const resetTurnstile = () => {
    if (window.turnstile && turnstileWidgetId) {
      window.turnstile.reset(turnstileWidgetId)
      setTurnstileToken(null)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setLoginError(null)

    // Check if Turnstile token is available
    if (!turnstileToken) {
      setLoginError("Please complete the security check")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting login with:", values.email)

      // Create a FormData object for the OAuth2 form submission
      const formData = new URLSearchParams()
      formData.append("username", values.email) // FastAPI OAuth2 expects 'username'
      formData.append("password", values.password)
      formData.append("turnstile_token", turnstileToken) // Add Turnstile token

      const response = await fetch("https://api.loryx.lol/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      })

      // Handle 422 errors specifically
      if (response.status === 422) {
        const errorData = await response.json()
        console.error("Validation error:", errorData)

        // Extract detailed validation error message
        let errorMessage = "Invalid input data"
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => `${err.loc.join(".")} - ${err.msg}`).join("; ")
        } else if (errorData.detail) {
          errorMessage = extractErrorMessage(errorData.detail)
        }

        setLoginError(errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Login response:", response.status, data)

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          setLoginError("Invalid email or password. Please try again.")
          throw new Error("Invalid credentials")
        } else if (response.status === 400 && data.detail === "Invalid Turnstile token") {
          setLoginError("Security check failed. Please try again.")
          resetTurnstile()
          throw new Error("Invalid Turnstile token")
        } else if (data.detail) {
          const errorMessage = extractErrorMessage(data.detail)
          setLoginError(errorMessage)
          throw new Error(errorMessage)
        } else {
          throw new Error("Login failed")
        }
      }

      // Check if we have an access token
      if (!data.access_token) {
        setLoginError("No access token received from server")
        throw new Error("No access token received")
      }

      console.log("Access token received, setting token")

      // Store token in localStorage as a backup
      localStorage.setItem("token", data.access_token)
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token)
      }

      // Set the token in cookies via our API route
      const setTokenResponse = await fetch("/api/auth/set-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: data.access_token,
          // Only include refresh_token if it exists
          ...(data.refresh_token && { refresh_token: data.refresh_token }),
        }),
      })

      if (!setTokenResponse.ok) {
        const errorData = await setTokenResponse.json().catch(() => ({}))
        console.error("Failed to set token:", errorData)
        throw new Error(errorData.error || "Failed to set authentication tokens")
      }

      // Get user profile to set user ID for status pings
      try {
        const profileResponse = await fetch("https://api.loryx.lol/auth/profile", {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        })

        if (profileResponse.ok) {
          const userData = await profileResponse.json()
          if (userData && userData.id) {
            // Set the user ID in the status context
            setUserId(userData.id)

            // Send an initial ping to mark the user as online using query parameter
            await fetch(`https://api.loryx.lol/auth/ping?user_id=${encodeURIComponent(userData.id)}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${data.access_token}`,
              },
              // No body needed as we're using query parameters
            })
          }
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError)
        // Continue with login even if profile fetch fails
      }

      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      })

      console.log("Login successful, redirecting to chat")

      // Check if there's a pending invite or returnUrl
      const pendingInvite = localStorage.getItem("pendingInvite")
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get("returnUrl")

      // Add a small delay before redirecting to ensure the toast is shown
      setTimeout(() => {
        // If there's a pending invite, redirect to the invite page
        if (pendingInvite) {
          localStorage.removeItem("pendingInvite")
          window.location.href = `/join-server/${pendingInvite}`
        }
        // If there's a returnUrl, redirect to it
        else if (returnUrl) {
          window.location.href = returnUrl
        }
        // Otherwise, redirect to the chat page
        else {
          window.location.href = "/chat"
        }
      }, 500)
    } catch (error) {
      console.error("Login error:", error)

      // Don't show toast if we already set a specific auth error
      if (!loginError) {
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : extractErrorMessage(error),
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {loginError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} className="bg-zinc-900 border-zinc-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="bg-zinc-900 border-zinc-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cloudflare Turnstile Widget */}
        <div className="flex justify-center my-4">
          <div ref={turnstileRef}></div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  )
}

