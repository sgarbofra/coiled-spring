let companyNamesCache: Record<string, string> | null = null
let loadingPromise: Promise<Record<string, string>> | null = null

export async function getCompanyNames(): Promise<Record<string, string>> {
  // Return cache if already loaded
  if (companyNamesCache) {
    return companyNamesCache
  }

  // Return existing promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      const response = await fetch('/api/sec-companies')

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status}`)
      }

      const tickerToName: Record<string, string> = await response.json()

      const count = Object.keys(tickerToName).length
      console.log(`[SEC Dataset] Loaded ${count} US company names`)

      companyNamesCache = tickerToName
      return tickerToName
    } catch (error) {
      console.error('[SEC Dataset] Failed to load company names:', error)
      // Return empty dict on error
      companyNamesCache = {}
      return {}
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

export function getCompanyName(ticker: string): string | null {
  if (!companyNamesCache) {
    return null
  }
  return companyNamesCache[ticker.toUpperCase()] || null
}
