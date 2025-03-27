import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Login | Loryx",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold">Login to Loryx</h1>
          <p className="text-gray-400">Enter your credentials to access your account</p>
        </div>
        <LoginForm />
        <div className="text-center text-sm">
          <p className="text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

