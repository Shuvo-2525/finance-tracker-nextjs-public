"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // This effect handles protecting the route
  React.useEffect(() => {
    // If auth is not loading and there is no user, redirect to login
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Handle user sign-out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success("Signed out successfully.")
      router.push("/login") // Redirect to login page after sign out
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out. Please try again.")
    }
  }

  // Show a loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // If there is a user, show the dashboard content
  return (
    user && (
      <div className="flex min-h-screen flex-col">
        {/* We will add a proper dashboard layout later */}
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/dashboard" className="font-bold">
              Finance Tracker
            </Link>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="container flex-1 py-8">
          <h1 className="text-3xl font-bold">
            Welcome, {user.displayName || "User"}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            This is your protected dashboard.
          </p>
          <p className="mt-4">Your email: {user.email}</p>
        </main>
      </div>
    )
  )
}