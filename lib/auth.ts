import { cookies } from "next/headers"

export async function refreshToken() {
  const cookieStore = cookies()
  const refreshToken = cookieStore.get("refresh_token")?.value

  if (!refreshToken) {
    return null
  }

  try {
    // The backend expects refresh_token as a URL parameter, not in the JSON body
    const response = await fetch(
      `https://api.loryx.lol/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Failed to refresh token")
    }

    const data = await response.json()

    // Update the access token cookie
    cookies().set("token", data.access_token, {
      maxAge: 30 * 60, // 30 minutes
      path: "/",
      httpOnly: false,
    })

    return data.access_token
  } catch (error) {
    console.error("Error refreshing token:", error)
    return null
  }
}

// Update the getCurrentUser function to use the profile endpoint
export async function getCurrentUser() {
  const cookieStore = cookies()
  let token = cookieStore.get("token")?.value

  if (!token) {
    console.log("getCurrentUser: No token found in cookies")
    return null
  }

  try {
    console.log("getCurrentUser: Fetching user data with token")

    // Add a timeout to the fetch request to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch("https://api.loryx.lol/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store", // Prevent caching
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    // If token expired, try to refresh it
    if (response.status === 401) {
      console.log("getCurrentUser: Token expired, attempting refresh")
      token = await refreshToken()

      if (!token) {
        console.log("getCurrentUser: Token refresh failed")
        return null
      }

      // Retry with new token
      const retryController = new AbortController()
      const retryTimeoutId = setTimeout(() => retryController.abort(), 5000) // 5 second timeout

      const retryResponse = await fetch("https://api.loryx.lol/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store", // Prevent caching
        signal: retryController.signal,
      }).finally(() => clearTimeout(retryTimeoutId))

      if (!retryResponse.ok) {
        console.log("getCurrentUser: Retry failed with status", retryResponse.status)
        return null
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      console.log("getCurrentUser: Initial request failed with status", response.status)
      return null
    }

    const userData = await response.json()
    console.log("getCurrentUser: Successfully fetched user data")
    return userData
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

