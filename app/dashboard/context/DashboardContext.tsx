"use client"

import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  // 1. Import useRef
  useRef,
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
    folderId?: string // <-- We need this
  }
}

// Define the shape of the context
type DashboardContextType = {
  userData: UserData | null
  sheetId: string | null
  folderId: string | null // <-- ADD THIS
  getGoogleAccessToken: () => Promise<string | null>
  uploadFileToDrive: (file: File) => Promise<string | null> // <-- ADD THIS
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
  const folderId = userData?.googleIntegration?.folderId || null // <-- ADD THIS

  // 2. Add a ref to act as a "lock"
  const isTokenRequestInProgress = useRef(false)

  /**
   * Re-authenticates with Google to get a fresh, short-lived access token.
   * This is necessary for making authenticated API calls to Google Sheets.
   */
  const getGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    // 3. Check if a request is already in progress
    if (isTokenRequestInProgress.current) {
      toast.info("Please complete the Google authentication popup first.")
      return null
    }

    const auth = getAuth()
    if (!auth.currentUser) {
      toast.error("Not authenticated. Please re-login.")
      return null
    }

    try {
      // 4. Set the lock
      isTokenRequestInProgress.current = true

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
      // 5. Handle the specific errors you're seeing
      if (error.code === "auth/popup-blocked") {
        toast.error("Popup blocked. Please allow popups for this site.")
      } else if (error.code === "auth/cancelled-popup-request") {
        toast.info("Authentication request cancelled.")
      } else {
        toast.error("Failed to authenticate with Google. Please try again.")
      }
      return null
    } finally {
      // 6. Always release the lock
      isTokenRequestInProgress.current = false
    }
  }, [])

  // --- NEW FUNCTION: uploadFileToDrive ---
  /**
   * Uploads a file to the user's "SaaS Finance Tracker" folder in Google Drive.
   * @param file The file object to upload.
   * @returns A promise that resolves to the file's webViewLink or null.
   */
  const uploadFileToDrive = useCallback(
    async (file: File): Promise<string | null> => {
      if (!folderId) {
        toast.error("Google Drive folder ID not found.")
        return null
      }

      const accessToken = await getGoogleAccessToken()
      if (!accessToken) {
        return null
      }

      try {
        // 1. Create FormData for multipart upload
        const formData = new FormData()

        // 1a. Add file metadata
        const metadata = {
          name: `${new Date().toISOString()}-${file.name}`, // Unique file name
          parents: [folderId],
        }
        formData.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        )

        // 1b. Add the file itself
        formData.append("file", file)

        // 2. Perform the upload
        const uploadResponse = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        )

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error("Error uploading file:", errorData)
          throw new Error("Failed to upload file to Google Drive.")
        }

        const uploadedFile = await uploadResponse.json()

        // 3. Get the file's shareable link (webViewLink)
        // We have to make a separate request to get this field.
        const fileDetailsResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${uploadedFile.id}?fields=webViewLink`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (!fileDetailsResponse.ok) {
          throw new Error("Failed to get file's shareable link.")
        }

        const fileDetails = await fileDetailsResponse.json()

        toast.success("Receipt uploaded successfully!")
        return fileDetails.webViewLink || null
      } catch (error: any) {
        console.error("Error in uploadFileToDrive:", error)
        toast.error(error.message || "Could not upload file.")
        return null
      }
    },
    [folderId, getGoogleAccessToken]
  )
  // --- END NEW FUNCTION ---

  return (
    <DashboardContext.Provider
      value={{
        userData,
        sheetId,
        folderId, // <-- PASS IT
        getGoogleAccessToken,
        uploadFileToDrive, // <-- PASS IT
      }}
    >
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