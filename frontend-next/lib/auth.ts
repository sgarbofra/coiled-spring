/**
 * Authentication utilities for client-side cookie management
 */

const TOKEN_COOKIE_NAME = 'cs_token'
const TOKEN_MAX_AGE = 604800 // 7 days in seconds

/**
 * Get JWT token from cookie
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null

  console.log('[AUTH] Getting token. All cookies:', document.cookie)

  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_COOKIE_NAME}=`))
    ?.split('=')[1]

  console.log('[AUTH] Extracted token:', token ? token.substring(0, 20) + '...' : 'null')

  return token || null
}

/**
 * Save JWT token to cookie
 */
export function setToken(token: string): void {
  if (typeof document === 'undefined') return

  const cookieString = `${TOKEN_COOKIE_NAME}=${token}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`
  console.log('[AUTH] Setting cookie:', cookieString.substring(0, 50) + '...')
  document.cookie = cookieString
  console.log('[AUTH] Cookie set. Current cookies:', document.cookie)
}

/**
 * Remove JWT token from cookie
 */
export function clearToken(): void {
  if (typeof document === 'undefined') return

  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`
}

/**
 * Create fetch headers with Authorization token if available
 */
export function createAuthHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}
