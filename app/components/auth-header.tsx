import Link from "next/link"

export function AuthHeader() {
  return (
    <header className="absolute top-0 z-50 w-full">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Site Logo and Name */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          <span className="font-bold sm:inline-block">Finance Tracker</span>
        </Link>
      </div>
    </header>
  )
}