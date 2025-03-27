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

// Declare Turnstile type
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string
      reset: (widgetId: string) => void
    }
  }
}

const formSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(30, { message: "Username must be at most 30 characters" })
      .regex(/^[a-zA-Z0-9._]+$/, {
        message: "Username can only contain letters, numbers, periods (.) and underscores (_)",
      }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
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
    setRegisterError(null)

    // Check if Turnstile token is available
    if (!turnstileToken) {
      setRegisterError("Please complete the security check")
      setIsLoading(false)
      return
    }

    try {
      // Create a FormData object for the registration
      const formData = new FormData()
      formData.append("email", values.email)
      formData.append("username", values.username)
      formData.append("password", values.password)
      formData.append("turnstile_token", turnstileToken) // Add Turnstile token

      const response = await fetch("https://api.loryx.lol/auth/register", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.detail === "Invalid Turnstile token") {
          setRegisterError("Security check failed. Please try again.")
          resetTurnstile()
          throw new Error("Invalid Turnstile token")
        } else {
          const errorMessage = extractErrorMessage(data)
          setRegisterError(errorMessage)
          throw new Error(errorMessage)
        }
      }

      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      })

      router.push("/auth/login")
    } catch (error) {
      if (!registerError) {
        toast({
          title: "Registration failed",
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
        {registerError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{registerError}</AlertDescription>
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">@</span>
                  <Input placeholder="username" {...field} className="bg-zinc-900 border-zinc-800 pl-7" />
                </div>
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
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
          {isLoading ? "Creating account..." : "Register"}
        </Button>
      </form>
    </Form>
  )
}

