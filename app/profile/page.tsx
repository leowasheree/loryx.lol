import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Profile | Discord-like Chat App",
  description: "Update your profile",
}

export default async function ProfilePage() {
  const cookieStore = cookies()
  const token = cookieStore.get("token")

  if (!token) {
    redirect("/auth/login")
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="container max-w-3xl py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-gray-400">Update your profile information</p>
          </div>
          <ProfileForm user={user} />
        </div>
      </div>
    </div>
  )
}

