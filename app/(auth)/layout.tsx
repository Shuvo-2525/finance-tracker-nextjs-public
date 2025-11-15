import { AuthHeader } from "@/app/components/auth-header"
import * as React from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthHeader />
      {/* This is the fix:
        - We make the main tag fill the screen and act as a flex container.
        - 'items-center' and 'justify-center' will center the form.
        - 'pt-16' adds padding so the form is below the header.
      */}
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-4 pt-16">
        {children}
      </main>
    </>
  )
}