import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Coiled Spring',
  description: 'Choose your plan. Free scanner, Pro with AI ($29/mo), or BYOK ($15/mo).',
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
