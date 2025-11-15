"use client" // This entire file is client-side

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

// Define the shape of the context data
type AuthContextType = {
  user: User | null
  loading: boolean
}

// Create the context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

// Create the AuthProvider component
// This component will wrap our entire application
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChanged is the Firebase listener for auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setUser(user)
      } else {
        // User is signed out
        setUser(null)
      }
      // Set loading to false once we have a user or know there isn't one
      setLoading(false)
    })

    // Clean up the subscription when the component unmounts
    return () => unsubscribe()
  }, []) // Empty dependency array means this runs once on mount

  const value = {
    user,
    loading,
  }

  // Provide the auth state to children components
  // We show nothing (or a loading spinner) while auth is pending
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// Create the 'useAuth' hook
// This is a simple shortcut to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext)
}