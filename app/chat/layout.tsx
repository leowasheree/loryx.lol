import type React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const token = cookieStore.get("token")

  // Debug the token
  console.log("Chat layout token:", token?.value ? "Token exists" : "No token found")

  if (!token) {
    console.log("No token found in server component, redirecting to login")
    redirect("/auth/login")
  }

  // Verify the token is valid by making a request to the profile endpoint
  try {
    // Add a timeout to the fetch request to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    console.log("Verifying token with profile API...")

    // The backend expects the token in the Authorization header with the format "Bearer {token}"
    const response = await fetch("https://api.loryx.lol/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      cache: "no-store",
      signal: controller.signal,
      next: { revalidate: 0 }, // Ensure we don't use cached data
    }).finally(() => clearTimeout(timeoutId))

    console.log("Profile response status:", response.status)

    if (!response.ok) {
      console.log(`Invalid token in server component (status: ${response.status}), redirecting to login`)
      // Delete the invalid token cookie
      cookies().delete("token")
      cookies().delete("refresh_token")
      return redirect("/auth/login")
    }

    console.log("Token verified successfully")
  } catch (error) {
    console.error("Error verifying token:", error)

    // Don't throw the error, just redirect to login
    // This prevents the "Error verifying token: Redirect" error
    cookies().delete("token")
    cookies().delete("refresh_token")
    return redirect("/auth/login")
  }

  return <div className="h-screen bg-black overflow-hidden">{children}</div>
}

