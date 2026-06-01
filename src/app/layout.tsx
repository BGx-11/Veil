import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Veil',
  description: 'Untraceable, Unhackable Web Browser',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
