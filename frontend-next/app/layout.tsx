import type { Metadata } from 'next'
import { UserProvider } from '@/contexts/UserContext'
import { AiPanelProvider } from '@/contexts/AiPanelContext'
import LayoutContent from '@/components/LayoutContent'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coiled Spring | Scanner Opzioni LEAPS — Terminale Antifragile',
  description: 'Scanner opzioni LEAPS con IV Rank, superficie di volatilità 3D e AI su 3.500+ titoli USA. Trova opzioni americane con volatilità compressa. LEAPS options scanner with IV Rank analysis for antifragile traders.',
  keywords: 'opzioni LEAPS, scanner opzioni, scanner opzioni americane, opzioni americane, IV Rank, volatilità implicita, opzioni lunga scadenza, LEAPS options, options scanner, IV Rank analysis, volatility surface, options trading, antifragile trading, strategie opzioni, greche opzioni',
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
    title: 'Coiled Spring | Scanner Opzioni LEAPS — Terminale Antifragile',
    description: 'Scanner opzioni LEAPS con IV Rank, superficie di volatilità 3D e AI su 3.500+ titoli USA. Trova opzioni con volatilità compressa.',
    type: 'website',
    url: 'https://www.coiledspring.app',
    siteName: 'Coiled Spring',
    locale: 'it_IT',
    alternateLocale: 'en_US',
    images: [
      {
        url: 'https://coiledspring.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coiled Spring — Scanner Opzioni LEAPS e Terminale Antifragile',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coiled Spring | Scanner Opzioni LEAPS',
    description: 'Scanner opzioni LEAPS con IV Rank, superficie di volatilità 3D e AI su 3.500+ titoli USA.',
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
  description: 'Scanner opzioni LEAPS con IV Rank, superficie di volatilità 3D e assistente AI. Analizza 3.500+ titoli USA per trovare opzioni americane con volatilità compressa.',
  inLanguage: ['it', 'en'],
  keywords: 'opzioni LEAPS, scanner opzioni, IV Rank, opzioni americane, LEAPS options, options scanner',
  author: {
    '@type': 'Person',
    description: '20-year capital markets professional',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Accesso Beta gratuito — Free Beta Access',
  },
  featureList: [
    'Scanner opzioni LEAPS su 3.500+ titoli USA',
    'IV Rank e IV Percentile in tempo reale',
    'Superficie di volatilità 3D interattiva',
    'Greche: Delta, Vega, Theta, Gamma',
    'Assistente AI per analisi opzioni',
    'Portfolio tracker con P&L e Greeks',
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
