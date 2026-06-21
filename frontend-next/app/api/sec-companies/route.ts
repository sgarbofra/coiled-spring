import { NextResponse } from 'next/server'

type SECCompanyData = {
  [key: string]: {
    cik_str: number
    ticker: string
    title: string
  }
}

export async function GET() {
  try {
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': 'Coiled Spring App contact@coiledspring.app',
      },
      cache: 'force-cache', // Cache indefinitely (data rarely changes)
    })

    if (!response.ok) {
      console.error('[SEC API] Error:', response.status)
      return NextResponse.json({ error: 'SEC API error' }, { status: response.status })
    }

    const data: SECCompanyData = await response.json()

    // Build ticker -> company name dictionary
    const tickerToName: Record<string, string> = {}

    Object.values(data).forEach((company) => {
      if (company.ticker && company.title) {
        // Normalize ticker to uppercase
        tickerToName[company.ticker.toUpperCase()] = company.title
      }
    })

    const count = Object.keys(tickerToName).length
    console.log(`[SEC Dataset] Loaded ${count} US company names`)

    return NextResponse.json(tickerToName)
  } catch (error) {
    console.error('[SEC Dataset] Failed to load company names:', error)
    return NextResponse.json({ error: 'Failed to fetch SEC data' }, { status: 500 })
  }
}
