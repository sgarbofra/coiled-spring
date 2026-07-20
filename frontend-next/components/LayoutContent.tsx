'use client'

import { usePathname } from 'next/navigation'
import NavBar from '@/components/NavBar'
import AiChatPanel from '@/components/AiChatPanel'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Public routes where navbar AND AI panel should NOT appear
  const publicRoutes = ['/', '/login', '/register', '/pricing', '/forgot-password', '/reset-password']
  const hideNavbar = publicRoutes.includes(pathname)

  // Routes where only the floating AI panel should be hidden
  // (Academy has its own inline chat — the global floating button would be redundant)
  const hideAiPanel = hideNavbar || pathname === '/academy' || pathname.startsWith('/academy/')

  return (
    <>
      {!hideNavbar && <NavBar />}
      <div className="min-h-0 flex-1">{children}</div>
      {!hideAiPanel && <AiChatPanel />}
    </>
  )
}
