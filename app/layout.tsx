import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lungisa — Post It. Bid It. Fix It.',
  description: "South Africa's first bidding marketplace for home repairs",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}