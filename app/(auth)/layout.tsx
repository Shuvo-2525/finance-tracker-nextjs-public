import { AuthHeader } from "@/app/components/auth-header"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthHeader />
      <main>{children}</main>
    </>
  )
}