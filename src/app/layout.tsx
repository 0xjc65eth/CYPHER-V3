// CRITICAL: Import browser polyfills FIRST
import '@/lib/browser-polyfills'
// CRITICAL: Import LaserEyes BigInt fix
import '@/lib/lasereyes-bigint-fix'
// CRITICAL: Import BigInt fix
import '@/lib/bigint-fix'
// CRITICAL: Import server error handlers to prevent crashes
import '@/lib/server-error-handlers'
// CRITICAL: Import wallet conflict resolver EARLY
import '@/app/wallet-conflict-init'
// CRITICAL: Import wallet provider patches
import '@/app/wallet-providers-init'

import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ConditionalNavigation } from '@/components/navigation/ConditionalNavigation'
import { ClientScriptLoader } from '@/components/ClientScriptLoader'
import { DEFAULT_META } from '@/lib/constants/routes'

const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://cypher-ordi.com'),
  title: DEFAULT_META.title,
  description: DEFAULT_META.description,
  keywords: DEFAULT_META.keywords,
  authors: [{ name: DEFAULT_META.author }],
  creator: DEFAULT_META.author,
  publisher: DEFAULT_META.author,
  robots: DEFAULT_META.robots,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // PWA Metadata
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CYPHER ORDI',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png' },
    ],
  },
  openGraph: {
    type: DEFAULT_META.ogType as any,
    siteName: DEFAULT_META.ogSiteName,
    title: DEFAULT_META.title,
    description: DEFAULT_META.description,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: DEFAULT_META.ogSiteName,
      },
    ],
  },
  twitter: {
    card: DEFAULT_META.twitterCard as any,
    site: DEFAULT_META.twitterSite,
    title: DEFAULT_META.title,
    description: DEFAULT_META.description,
    images: ['/og-image.png'],
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7931A' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' }
  ],
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Critical Performance Optimizations */}
        <link rel="preconnect" href="https://api.coingecko.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://mempool.space" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.hiro.so" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.binance.com" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="CYPHER ORDI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CYPHER ORDI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#F7931A" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="mask-icon" href="/icons/icon-192x192.png" color="#F7931A" />
        
        {/* Splash screens for iOS */}
        <link rel="apple-touch-startup-image" href="/splash/iphone5_splash.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone6_splash.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphoneplus_splash.png" media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphonex_splash.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/ipad_splash.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipadpro1_splash.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipadpro3_splash.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        
        {/* Theme Script - Critical for preventing FOUC */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable} bg-black text-white antialiased`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-[#F7931A] focus:text-black focus:font-bold focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <ClientScriptLoader />
        <Providers>
          <ConditionalNavigation>
            <main id="main-content">
              {children}
            </main>
          </ConditionalNavigation>
        </Providers>
      </body>
    </html>
  )
}