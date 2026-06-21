'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createAuthHeaders } from '@/lib/auth'

type User = {
  id: number
  email: string
  plan: string        // free | pro | pro_byok
  has_broker: boolean
  has_ai_key: boolean
  ai_queries_today: number
}

type UserContextType = {
  user: User | null
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType>({ user: null, loading: true, refresh: () => {} })

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_user = () => {
    fetch('/api/auth/me', {
      headers: createAuthHeaders(),
      credentials: 'include', // Send cookies
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUser(d); else setUser(null) })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch_user() }, [])

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetch_user }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
