import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    console.log("GET /api/auth/get-user - Token found:", token.substring(0, 10) + "...")

    // Since there's no specific /auth/me endpoint, we'll use the profile endpoint
    // to verify the token is valid and get user data
    // Add the token as a query parameter as required by the backend
    const response = await fetch("https://api.loryx.lol/auth/profile", {
      method: "GET", // Using GET to retrieve profile data
      headers: {
        Authorization: `Bearer ${token}`, // Only use the Authorization header
      },
      cache: "no-store",
    })

    console.log("Profile API response status:", response.status)

    if (!response.ok) {
      // If token is invalid, try to refresh it
      if (response.status === 401) {
        console.log("Token invalid, attempting to refresh")
        const refreshToken = cookieStore.get("refresh_token")?.value

        if (refreshToken) {
          // The backend expects refresh_token as a URL parameter, not in the JSON body
          const refreshResponse = await fetch(
            `https://api.loryx.lol/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            },
          )

          console.log("Refresh token response status:", refreshResponse.status)

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            console.log("Token refreshed successfully")

            // Update the token cookie
            cookieStore.set("token", refreshData.access_token, {
              maxAge: 30 * 60,
              path: "/",
              httpOnly: false, // Make it accessible to client-side JavaScript
              sameSite: "lax",
            })

            // Try again with the new token
            const retryResponse = await fetch("https://api.loryx.lol/auth/profile", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${refreshData.access_token}`,
              },
              cache: "no-store",
            })

            console.log("Retry profile API response status:", retryResponse.status)

            if (retryResponse.ok) {
              const userData = await retryResponse.json()
              return NextResponse.json({ user: userData, authenticated: true })
            }
          }
        }
      }

      // If we get here, authentication failed
      console.log("Authentication failed after all attempts")
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const userData = await response.json()
    console.log("User data retrieved successfully")
    return NextResponse.json({ user: userData, authenticated: true })
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json({ error: "Failed to get user data" }, { status: 500 })
  }
}

