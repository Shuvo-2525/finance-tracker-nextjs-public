import * as React from "react"

export function IconGoogle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10z" />
      <path d="M12 12v-2a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z" />
      <path d="M12 12v2a4 4 0 0 1 4 4h-8a4 4 0 0 1 4-4z" />
    </svg>
  )
}