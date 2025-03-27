import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    // Set cookies using the server-side API
    const cookieStore = cookies()

    // Set the token without httpOnly to make it accessible to client-side JavaScript
    cookieStore.set("token", access_token, {
      maxAge: 30 * 60, // 30 minutes
      path: "/",
      httpOnly: false, // Make it accessible to client-side JavaScript
      sameSite: "lax",
    })

    // Only set refresh_token if it exists
    if (refresh_token) {
      cookieStore.set("refresh_token", refresh_token, {
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
        httpOnly: false, // Make it accessible to client-side JavaScript
        sameSite: "lax",
      })
    }

    // Also set a plain JS cookie for client-side access
    const headers = new Headers()
    headers.append("Set-Cookie", `token=${access_token}; Path=/; Max-Age=${30 * 60}; SameSite=Lax`)

    if (refresh_token) {
      headers.append("Set-Cookie", `refresh_token=${refresh_token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`)
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: headers,
    })
  } catch (error) {
    console.error("Error setting tokens:", error)
    return NextResponse.json({ error: "Failed to set tokens" }, { status: 500 })
  }
}

