"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
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

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const { user, loading } = useAuth()

  // If user is already logged in, redirect to dashboard
  React.useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Create user document *only if* one doesn't exist (for Google sign-in)
  const createUserDocumentIfNotExists = async (
    userId: string,
    email: string,
    displayName: string
  ) => {
    try {
      const userRef = doc(db, "users", userId)
      const docSnap = await getDoc(userRef)

      if (!docSnap.exists()) {
        // This is a new user signing up via Google on the login page
        await setDoc(userRef, {
          uid: userId,
          email: email,
          displayName: displayName,
          createdAt: new Date(),
          subscriptionStatus: "free",
          entities: [],
        })
        toast.success("Welcome! Your account has been created.")
      }
    } catch (error) {
      console.error("Error creating user document:", error)
      toast.error("Error saving user data. Please contact support.")
    }
  }

  // Handle Email/Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success("Signed in successfully! Redirecting...")
      router.push("/dashboard") // Redirect to dashboard on success
    } catch (error: any) {
      console.error(error)
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        toast.error("Invalid email or password.")
      } else {
        toast.error("An error occurred during sign in. Please try again.")
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

      // Check and create doc if it's a new user
      await createUserDocumentIfNotExists(
        user.uid,
        user.email!,
        user.displayName || "User"
      )

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
    // You can replace this with a nice spinner component
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
    // We removed the outer div. The card is now the top-level element.
    <Card className="w-full max-w-lg p-6 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
        <CardDescription className="text-base">
          Sign in to your account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleEmailLogin} className="space-y-6">
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
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {isLoading ? "Signing In..." : "Sign In"}
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
          Sign in with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center pt-6">
        <p className="text-base text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button variant="link" asChild className="p-0 text-base">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  )
}