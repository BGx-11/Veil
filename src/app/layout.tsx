import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://github.com/BGx-11/Veil'),
  title: 'Veil Browser | Open Source Privacy Browser',
  description: 'An open-source desktop browser featuring on-device AI summarization, integrated tracking protection, and Tor network routing.',
  keywords: ['browser', 'open source browser', 'privacy browser', 'tor integration', 'local AI', 'tauri browser', 'nextjs browser'],
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
    <html lang="en" data-theme="light" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
