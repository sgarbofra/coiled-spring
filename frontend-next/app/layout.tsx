import type { Metadata } from 'next'
import { UserProvider } from '@/contexts/UserContext'
import { AiPanelProvider } from '@/contexts/AiPanelContext'
import LayoutContent from '@/components/LayoutContent'
import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Coiled Spring | LEAPS Options Scanner — Antifragile Terminal',
  description: 'LEAPS options scanner with IV Rank, 3D volatility surface and AI across 3,500+ US underlyings. Find options with historically compressed volatility. IV Rank analysis for antifragile traders.',
  keywords: 'LEAPS options, options scanner, US options scanner, IV Rank, implied volatility, long-dated options, options scanner, IV Rank analysis, volatility surface, options trading, antifragile trading, options strategies, Greeks',
  alternates: {
    canonical: 'https://www.coiledspring.app',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Coiled Spring | LEAPS Options Scanner — Antifragile Terminal',
    description: 'LEAPS options scanner with IV Rank, 3D volatility surface and AI across 3,500+ US underlyings. Find options with compressed volatility.',
    type: 'website',
    url: 'https://www.coiledspring.app',
    siteName: 'Coiled Spring',
    locale: 'en_US',
    images: [
      {
        url: 'https://coiledspring.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coiled Spring — LEAPS Options Scanner and Antifragile Terminal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coiled Spring | LEAPS Options Scanner',
    description: 'LEAPS options scanner with IV Rank, 3D volatility surface and AI across 3,500+ US underlyings.',
    images: ['https://coiledspring.app/og-image.png'],
  },
  robots: 'index, follow',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Coiled Spring',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: 'https://coiledspring.app',
  description: 'LEAPS options scanner with IV Rank, 3D volatility surface and AI assistant. Scan 3,500+ US underlyings to find options with historically compressed volatility.',
  inLanguage: 'en',
  keywords: 'LEAPS options, options scanner, IV Rank, US options, implied volatility, volatility surface',
  author: {
    '@type': 'Person',
    description: '20-year capital markets professional',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Free Beta Access',
  },
  featureList: [
    'LEAPS options scanner across 3,500+ US underlyings',
    'IV Rank and IV Percentile',
    'Interactive 3D volatility surface',
    'Greeks: Delta, Vega, Theta, Gamma',
    'AI assistant for options analysis',
    'Portfolio tracker with P&L and Greeks',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex h-full flex-col bg-slate-950 text-slate-100">
        <UserProvider>
          <AiPanelProvider>
            <LayoutContent>{children}</LayoutContent>
          </AiPanelProvider>
        </UserProvider>
      </body>
    </html>
  )
}
