import type { Metadata } from 'next'
import { Manrope, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { portalConfig } from '@/lib/config/portal'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: portalConfig.name,
  description: 'Answering service customer portal — messages, billing, and account management.',
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: portalConfig.name,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="theme-color" content={portalConfig.brandColor} />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <style>{`:root { --portal-brand-color: ${portalConfig.brandColor}; }`}</style>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
