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
import { IconGoogle } from "@/app/components/icons"

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

      await updateProfile(user, {
        displayName: displayName,
      })

      await createUserDocument(user.uid, user.email!, displayName)

      toast.success("Account created successfully! Redirecting...")
      router.push("/dashboard")
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

      const userRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(userRef)

      if (!docSnap.exists()) {
        await createUserDocument(
          user.uid,
          user.email!,
          user.displayName || "User"
        )
      }

      toast.success("Signed in successfully! Redirecting...")
      router.push("/dashboard")
    } catch (error: any) {
      console.error(error)
      toast.error("An error occurred with Google Sign-In. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    // We removed the outer div. The card is now the top-level element.
    <Card className="w-full max-w-lg p-6 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
        <CardDescription className="text-base">
          Enter your details below to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleEmailSignUp} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-base">
              Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              className="h-10 text-base" // Larger input
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-10 text-base" // Larger input
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="•••••••• (6+ characters)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-10 text-base" // Larger input
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="h-10 text-base" // Larger input
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg" // Larger button
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <Separator className="my-6" />

        <Button
          variant="outline"
          className="w-full"
          size="lg" // Larger button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <IconGoogle className="mr-2 h-5 w-5" />
          Sign up with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center pt-6">
        <p className="text-base text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" asChild className="p-0 text-base">
            <Link href="/login">Sign In</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  )
}