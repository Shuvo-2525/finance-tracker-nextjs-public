"use client"

import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react"
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { toast } from "sonner"

// Define the shape of the user data we get from the layout
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

// Define the shape of the context
type DashboardContextType = {
  userData: UserData | null
  sheetId: string | null
  getGoogleAccessToken: () => Promise<string | null>
}

// Create the context
const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
)

// Create the Provider component
export function DashboardProvider({
  children,
  value,
}: {
  children: ReactNode
  value: { userData: UserData | null }
}) {
  const { userData } = value
  const sheetId = userData?.googleIntegration?.sheetId || null

  /**
   * Re-authenticates with Google to get a fresh, short-lived access token.
   * This is necessary for making authenticated API calls to Google Sheets.
   */
  const getGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    const auth = getAuth()
    if (!auth.currentUser) {
      toast.error("Not authenticated. Please re-login.")
      return null
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("https://www.googleapis.com/auth/drive.file")
      provider.addScope("https://www.googleapis.com/auth/spreadsheets")

      // This will either silently refresh or show a popup if needed
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const accessToken = credential?.accessToken

      if (accessToken) {
        return accessToken
      } else {
        toast.error("Could not get Google access token.")
        return null
      }
    } catch (error: any) {
      console.error("Error getting fresh Google token:", error)
      toast.error("Failed to authenticate with Google. Please try again.")
      return null
    }
  }, [])

  return (
    <DashboardContext.Provider value={{ userData, sheetId, getGoogleAccessToken }}>
      {children}
    </DashboardContext.Provider>
  )
}

// Create the custom hook to use this context
export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}