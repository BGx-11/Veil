import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Veil Browser | Open Source Privacy Browser',
  description: 'An open-source desktop browser featuring on-device AI summarization, integrated tracking protection, and Tor network routing.',
  keywords: ['browser', 'open source browser', 'privacy browser', 'tor integration', 'local AI', 'electron browser', 'nextjs browser'],
  authors: [{ name: 'Veil Browser Community' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Veil Browser',
    description: 'An open-source desktop browser featuring on-device AI summarization, integrated tracking protection, and Tor network routing.',
    url: 'https://github.com/BGx-11/Veil',
    siteName: 'Veil Browser',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Veil Browser Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veil Browser | Open Source Privacy Browser',
    description: 'An open-source desktop browser featuring on-device AI summarization, integrated tracking protection, and Tor network routing.',
    images: ['/logo.png'],
  },
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
