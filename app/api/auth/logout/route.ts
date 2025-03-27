import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const cookieStore = cookies()

    // Clear the authentication cookies
    cookieStore.delete("token")
    cookieStore.delete("refresh_token")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging out:", error)
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 })
  }
}

