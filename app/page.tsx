import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid max-w-screen-lg place-items-center gap-6 pb-8 pt-6 text-center md:pb-12 md:pt-10 lg:py-28">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
            All your company finances,
            <br className="hidden sm:inline" />
            all in one place.
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Stop juggling spreadsheets. Our tracker connects directly to your
            Google Account for ultimate privacy and control. Manage multiple
            entities seamlessly.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Get Started for Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#features">Learn More</Link>
            </Button>
          </div>
        </section>

        {/* Features Section (Placeholder) */}
        <section
          id="features"
          className="container space-y-6 bg-slate-50/50 py-8 dark:bg-slate-900/50 md:py-12 lg:py-24"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tighter sm:text-3xl md:text-4xl">
              Features
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              This is where you will list the key features of your product.
            </p>
          </div>
          {/* Feature Grid (Placeholder) */}
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {/* Feature 1 */}
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <div className="space-y-2">
                  <h3 className="font-bold">Multi-Entity Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage finances for all your different side-hustles or
                    companies.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12"
                >
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <div className="space-y-2">
                  <h3 className="font-bold">Google Drive Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data lives in your Google Sheets. You own it.
                  </p>
                </div>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                <div className="space-y-2">
                  <h3 className="font-bold">Secure by Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Tokens are encrypted. We build with privacy first.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}