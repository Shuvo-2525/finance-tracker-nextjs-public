import { AuthHeader } from "@/app/components/auth-header"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthHeader />
      {/* This main tag now centers the card and adds padding for the header */}
      <main className="flex min-h-screen flex-col items-center justify-center p-4 pt-20">
        {children}
      </main>
    </>
  )
}