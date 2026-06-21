'use client'

import { usePathname } from 'next/navigation'
import NavBar from '@/components/NavBar'
import AiChatPanel from '@/components/AiChatPanel'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Public routes where navbar/AI panel should NOT appear
  const publicRoutes = ['/', '/login', '/register', '/pricing', '/forgot-password', '/reset-password']
  const hideNavbar = publicRoutes.includes(pathname)

  return (
    <>
      {!hideNavbar && <NavBar />}
      <div className="min-h-0 flex-1">{children}</div>
      {!hideNavbar && <AiChatPanel />}
    </>
  )
}
