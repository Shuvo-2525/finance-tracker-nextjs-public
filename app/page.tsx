import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Rocket, ShieldCheck } from "lucide-react"

export default function Home() {
  const features = [
    {
      icon: <Database className="h-10 w-10 text-primary" />,
      title: "Your Data, Your Drive",
      description:
        "All financial data is stored directly in your own Google Drive. You have 100% ownership and privacy. We never see your numbers.",
    },
    {
      icon: <Rocket className="h-10 w-10 text-primary" />,
      title: "Multi-Entity Management",
      description:
        "Seamlessly switch between your different businesses, side-hustles, or properties. Keep all your finances separate but accessible.",
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      title: "Secure by Design",
      description:
        "We use bank-level encryption (AES-256) to protect your sensitive API tokens at rest. Security is not an afterthought; it's our foundation.",
    },
  ]

  const howItWorks = [
    {
      step: "01",
      title: "Connect Your Google Account",
      description:
        "Sign up and securely grant access to Google Drive & Sheets. We'll automatically create your master finance sheet.",
    },
    {
      step: "02",
      title: "Create Your Entities",
      description:
        "Set up your different companies or projects. Each entity gets its own dedicated tabs within your master sheet.",
    },
    {
      step: "03",
      title: "Track Transactions",
      description:
        "Log income, expenses, and transfers through our simple interface. All data is written directly to your Google Sheet in real-time.",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid max-w-screen-lg place-items-center gap-8 pb-12 pt-16 text-center md:pb-16 md:pt-24 lg:py-32">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
            All your company finances,
            <br className="hidden sm:inline" />
            <span className="text-primary">all in one place.</span>
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Stop juggling spreadsheets. Our tracker connects directly to your
            Google Account for ultimate privacy and control. Manage multiple
            entities seamlessly.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg" className="px-8 text-base">
              <Link href="/signup">Get Started for Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 text-base"
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="container space-y-12 py-12 md:py-20 lg:py-24"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tighter sm:text-4xl md:text-5xl">
              Features
            </h2>
            <p className="max-w-[85%] text-lg leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Everything you need to manage your finances without giving up
              privacy.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-8 sm:grid-cols-2 md:max-w-4xl lg:max-w-6xl lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative overflow-hidden rounded-xl border bg-background p-6 shadow"
              >
                <div className="flex flex-col justify-between rounded-md">
                  <div className="mb-4">{feature.icon}</div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="container space-y-12 py-12 md:py-20 lg:py-24"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tighter sm:text-4xl md:text-5xl">
              How It Works
            </h2>
            <p className="max-w-[85%] text-lg leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Get up and running in just 3 simple steps.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-8 md:max-w-4xl lg:max-w-6xl lg:grid-cols-3">
            {howItWorks.map((step) => (
              <div
                key={step.title}
                className="flex flex-col space-y-4 rounded-xl border bg-background p-6 shadow"
              >
                <span className="text-5xl font-bold text-primary">
                  {step.step}
                </span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-base text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="cta"
          className="container py-12 md:py-20 lg:py-24"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-6 rounded-xl border bg-background p-10 text-center shadow-lg md:p-16">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tighter sm:text-4xl md:text-5xl">
              Take Control of Your Finances
            </h2>
            <p className="max-w-[85%] text-lg leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Stop wondering where your money is going. Start tracking, start
              winning. Get your free account today.
            </p>
            <Button asChild size="lg" className="px-10 text-lg">
              <Link href="/signup">Get Started for Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}