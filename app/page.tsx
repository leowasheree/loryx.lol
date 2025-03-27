import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get("token")

  console.log("Home page token:", token?.value ? "Token exists" : "No token found")

  // Only redirect if we're absolutely sure about the token state
  if (!token || !token.value) {
    console.log("No token found, redirecting to login")
    redirect("/auth/login")
  } else {
    console.log("Token found, redirecting to chat")
    redirect("/chat")
  }
}

