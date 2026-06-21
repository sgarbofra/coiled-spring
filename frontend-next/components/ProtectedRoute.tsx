'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

/**
 * Protects routes from unauthenticated access.
 * Redirects to /login?redirect=<current-page> if user is not authenticated.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`
      router.push(redirectUrl)
    }
  }, [user, loading, router, pathname])

  // Show nothing while checking auth or if not authenticated
  if (loading || !user) {
    return null
  }

  // User is authenticated - show the protected content
  return <>{children}</>
}
