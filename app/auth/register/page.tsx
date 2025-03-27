import type { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Register | Loryx",
  description: "Create a new account",
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src="/images/calyx-logo-transparent.png" alt="Loryx Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold">Create a Loryx Account</h1>
          <p className="text-gray-400">Enter your details to create a new account</p>
        </div>
        <RegisterForm />
        <div className="text-center text-sm">
          <p className="text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

