import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login | Coiled Spring',
  robots: 'noindex',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
