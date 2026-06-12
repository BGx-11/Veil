import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Veil Browser — Privacy-First AI Browser',
  description: 'The next-generation browser engineered for absolute privacy. Built-in ad blocking, Tor network, and on-device AI.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
