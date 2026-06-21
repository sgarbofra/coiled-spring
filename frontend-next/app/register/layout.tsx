import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register | Coiled Spring',
  robots: 'noindex',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
