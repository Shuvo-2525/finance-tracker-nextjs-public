"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { useAuth } from "@/app/context/AuthContext"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { IconGoogle } from "@/app/components/icons" // Import our new icon

export default function SignUpPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const { user, loading } = useAuth()

  // If user is already logged in, redirect to dashboard
  React.useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Create a new user document in Firestore
  const createUserDocument = async (
    userId: string,
    email: string,
    displayName: string
  ) => {
    try {
      const userRef = doc(db, "users", userId)
      await setDoc(userRef, {
        uid: userId,
        email: email,
        displayName: displayName,
        createdAt: new Date(),
        // Add any other default fields for a new user
        subscriptionStatus: "free",
        entities: [],
      })
    } catch (error) {
      console.error("Error creating user document:", error)
      toast.error("Error saving user data. Please contact support.")
    }
  }

  // Handle Email/Password Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.")
      return
    }
    if (!displayName) {
      toast.error("Please enter your name.")
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      const user = userCredential.user

      // Update Firebase auth profile with display name
      await updateProfile(user, {
        displayName: displayName,
      })

      // Create user document in Firestore
      await createUserDocument(user.uid, user.email!, displayName)

      toast.success("Account created successfully! Redirecting...")
      router.push("/dashboard") // Redirect to dashboard on success
    } catch (error: any) {
      console.error(error)
      if (error.code === "auth/email-already-in-use") {
        toast.error("This email is already in use.")
      } else {
        toast.error("An error occurred during sign up. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document already exists (this handles both sign in and sign up)
      // For a new user signing up with Google, we'll create their doc
      const userRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(userRef)

      if (!docSnap.exists()) {
        // This is a new user
        await createUserDocument(
          user.uid,
          user.email!,
          user.displayName || "User"
        )
      }

      toast.success("Signed in successfully! Redirecting...")
      router.push("/dashboard") // Redirect to dashboard
    } catch (error: any) {
      console.error(error)
      toast.error("An error occurred with Google Sign-In. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render the form if auth state is still loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // Don't render if user is already logged in (will be redirected)
  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>
            Enter your details below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <Separator className="my-6" />

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <IconGoogle className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" asChild className="p-0">
              <Link href="/login">Sign In</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}