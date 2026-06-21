import type { Metadata } from 'next'
import { UserProvider } from '@/contexts/UserContext'
import { AiPanelProvider } from '@/contexts/AiPanelContext'
import LayoutContent from '@/components/LayoutContent'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coiled Spring | Antifragile Options Terminal',
  description: 'LEAPS scanner, IV Rank analysis and AI-powered insights for options traders. Built for traders who think in convexity.',
  keywords: 'LEAPS options, IV Rank, options scanner, volatility surface, options trading, antifragile trading',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Coiled Spring | Antifragile Options Terminal',
    description: 'LEAPS scanner, IV Rank analysis and AI-powered insights for options traders. Built for traders who think in convexity.',
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coiled Spring | Antifragile Options Terminal',
    description: 'LEAPS scanner, IV Rank analysis and AI-powered insights for options traders. Built for traders who think in convexity.',
  },
  robots: 'index, follow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full">
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
