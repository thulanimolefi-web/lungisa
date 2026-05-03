import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lungisa — Post It. Bid It. Fix It.',
  description: "South Africa's first bidding marketplace for home repairs",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" async/>
      </head>
      <body>{children}</body>
    </html>
  )
}