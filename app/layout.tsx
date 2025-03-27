import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { StatusProvider } from "@/components/status-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Loryx",
  description: "A modern chat application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/calyx-logo-transparent.png" />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <StatusProvider>{children}</StatusProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'