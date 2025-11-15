"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import { auth, db } from "@/lib/firebase"
import {
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
} from "firebase/auth"
import { doc, onSnapshot, setDoc } from "firebase/firestore"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, Files, LogOut } from "lucide-react"
import { IconGoogle } from "@/app/components/icons"
import { DashboardHeader } from "./components/DashboardHeader"
import { DashboardNav } from "./components/DashboardNav"

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [userData, setUserData] = React.useState<UserData | null>(null)
  const [isDataLoading, setIsDataLoading] = React.useState(true)
  const [isConnecting, setIsConnecting] = React.useState(false)

  // This effect handles protecting the route
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // This effect fetches the user's data from Firestore in real-time
  React.useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid)
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData)
          } else {
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
      return () => unsubscribe()
    }
  }, [user])

  // This is the new function to connect to Google Drive & Sheets
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

      const { folderId, sheetId } = await response.json()

      if (!folderId || !sheetId) {
        throw new Error("Invalid response from setup API.")
      }

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

  // If the user is connected, show the dashboard.
  if (userData && userData.googleIntegration?.connected) {
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <DashboardNav />
        <div className="flex flex-col">
          <DashboardHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // If the user is NOT connected, show the "Connect" prompt.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-lg">
        <Files className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Connect to Google Drive</h1>
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
    </div>
  )
}