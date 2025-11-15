"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import { auth, db } from "@/lib/firebase"
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
} from "firebase/auth"
import { doc, onSnapshot, setDoc } from "firebase/firestore"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, Files, LogOut } from "lucide-react"
import { IconGoogle } from "@/app/components/icons" // Corrected import path

// Define a type for our user's Firestore data
type UserData = {
  displayName: string
  email: string
  subscriptionStatus: string
  googleIntegration?: {
    connected: boolean
    sheetId?: string
    folderId?: string
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // We need new state to hold our user's data from Firestore
  const [userData, setUserData] = React.useState<UserData | null>(null)
  const [isDataLoading, setIsDataLoading] = React.useState(true)
  const [isConnecting, setIsConnecting] = React.useState(false)

  // This effect handles protecting the route
  React.useEffect(() => {
    // If auth is not loading and there is no user, redirect to login
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // This effect fetches the user's data from Firestore in real-time
  React.useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid)

      // onSnapshot listens for real-time updates
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData)
          } else {
            // This case should ideally not happen if signup is working
            toast.error("Could not find user data. Contacting support.")
            console.error("No user document found for UID:", user.uid)
          }
          setIsDataLoading(false)
        },
        (error) => {
          console.error("Error fetching user data:", error)
          toast.error("Failed to load user data.")
          setIsDataLoading(false)
        }
      )

      // Clean up the listener when the component unmounts
      return () => unsubscribe()
    }
  }, [user]) // Re-run this effect when the user object changes

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

  // This is the updated function to connect to Google Drive & Sheets
  const handleGoogleConnect = async () => {
    if (!user) {
      toast.error("You must be logged in to connect.")
      return
    }

    setIsConnecting(true)
    const provider = new GoogleAuthProvider()
    provider.addScope("https://www.googleapis.com/auth/drive.file")
    provider.addScope("https://www.googleapis.com/auth/spreadsheets")

    const authInstance = getAuth()

    try {
      const result = await signInWithPopup(authInstance, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const accessToken = credential?.accessToken

      if (!accessToken) {
        toast.error("Could not get access token from Google.")
        setIsConnecting(false)
        return
      }

      toast.success("Permissions granted! Setting up your files...")

      // *** THIS IS THE NEW PART ***
      // Send the token to our server-side API route
      const response = await fetch("/api/setup-google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || "Failed to set up Google files.")
      }

      // Get back the new folder and sheet IDs
      const { folderId, sheetId } = await response.json()

      if (!folderId || !sheetId) {
        throw new Error("Invalid response from setup API.")
      }

      // Now, save this information to Firestore
      const userRef = doc(db, "users", user.uid)
      await setDoc(
        userRef,
        {
          googleIntegration: {
            connected: true,
            folderId: folderId,
            sheetId: sheetId,
          },
        },
        { merge: true }
      )

      toast.success("Successfully created your Google Sheet and Folder!")
      // The onSnapshot listener will automatically update the UI!
    } catch (error: any) {
      console.error("Error connecting Google account:", error)
      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Connection process cancelled.")
      } else {
        toast.error(error.message || "Failed to connect to Google.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // ... (rest of the component is the same as before) ...
  // Show a loading state while auth or data is being checked
  if (authLoading || isDataLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your data...</p>
      </div>
    )
  }

  // This should not be visible, as the effect above will redirect
  if (!user) {
    return null
  }

  // This is the main render logic
  return (
    <div className="flex min-h-screen flex-col">
      {/* Dashboard Header */}
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            <span>Finance Tracker</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container flex-1 py-8">
        {userData && userData.googleIntegration?.connected ? (
          // 1. User IS connected. Show the main app (for now, a welcome).
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {userData.displayName || "User"}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              This is your protected dashboard.
            </p>
            <p className="mt-4">Your email: {userData.email}</p>
            <p className="mt-4 text-green-600">
              You are connected to Google Drive & Sheets!
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sheet ID: {userData.googleIntegration?.sheetId}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Folder ID: {userData.googleIntegration?.folderId}
            </p>
          </div>
        ) : (
          // 2. User IS NOT connected. Show the "Connect" prompt.
          <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-lg">
            <Files className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 text-2xl font-bold">
              Connect to Google Drive
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              To use your finance tracker, you must grant permission to access
              Google Drive and Google Sheets.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              We will create a single new folder (
              <b>&quot;SaaS Finance Tracker&quot;</b>) and one Google Sheet in your
              personal drive. <b>You retain 100% ownership of your data.</b>
            </p>
            <Button
              size="lg"
              className="mt-8 w-full"
              onClick={handleGoogleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <IconGoogle className="mr-2 h-5 w-5" />
              )}
              {isConnecting
                ? "Connecting..."
                : "Connect to Google Drive & Sheets"}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}