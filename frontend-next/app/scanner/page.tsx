'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute'
import { scannerStore } from '@/lib/scanner-store'

const VolSurface = dynamic(() => import('@/components/VolSurface'), { ssr: false })

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type ScanResult = {
  underlying: string; option_type: string; strike: number; expiration: string
  dte: number; bid: number; ask: number; mid: number; last_price: number; spread_pct: number
  iv: number; iv_rank: number; delta: number; gamma: number; vega: number
  theta: number; open_interest: number; volume: number; symbol_key: string
}

type Watchlist = { id: string; name: string }

const CATEGORY_LABELS: Record<string, string> = {
  stocks:      'STOCKS',
  etf:         'ETF',
  indici:      'INDICI',
  commodities: 'COMMODITIES',
}

const STATIC_UNIVERSE: Record<string, string[]> = {
  stocks: [
    'AAPL','ABNB','ADBE','ADI','ADP','ADSK','AIG','AMAT','AMD','AMGN',
    'AMZN','ANET','ANSS','AON','APD','ARM','ASML','AVGO','AXP','AZN',
    'BA','BABA','BAC','BIIB','BKNG','BLK','BMY','BRK.B','BSX','C',
    'CAT','CDNS','CEG','CL','CMCSA','COIN','COP','COST','CRM','CRWD','CSCO',
    'CVS','CVX','DE','DHR','DIS','DXCM','EA','ENPH','EQIX','ETN',
    'F','FANG','FAST','FTNT','GE','GILD','GM','GOOG','GS','HD',
    'HON','HOOD','HPQ','IBM','IDXX','INTC','INTU','ISRG','JNJ','JPM','KO',
    'LIN','LCID','LLY','LMT','LOW','LYFT','MA','MCD','MDLZ','MDT','META','MMM',
    'MO','MRK','MSTR','MS','MSFT','MU','NEE','NET','NFLX','NIO','NKE','NOW',
    'NVDA','NXPI','ORCL','PANW','PAYX','PDD','PEP','PFE','PG','PINS','PLTR',
    'PM','PYPL','QCOM','RDDT','REG','REGN','RIVN','RBLX','ROP','ROST','SBUX',
    'SHOP','SMCI','SNAP','SNOW','SOFI','SQ','T','TGT','TMO','TMUS','TSLA',
    'TXN','UBER','UNH','UPS','V','VZ','WBA','WMT','XPEV','XOM','ZM','ROKU',
    'AFRM','AI','DASH','DDOG','GME','MRNA','PATH','ZS',
  ],
  etf: [
    'SPY','QQQ','IWM','DIA','MDY','VTI','VOO','VEA','VWO','EFA',
    'EEM','IJR','IJH','XLE','XLF','XLK','XLV','XLY','XLI','XLU',
    'XLP','XLB','XLRE','SMH','SOXX','ARKK','ARKW','ARKG',
    'TLT','IEF','SHY','HYG','LQD','BND','AGG',
    'GDX','GDXJ','SLX','PPLT',
  ],
  indici: ['DIA','MDY','VTI','VEA','VWO','IJR','IJH','SPY','QQQ','IWM'],
  commodities: ['GLD','SLV','GDX','GDXJ','USO','UNG','CORN','WEAT','SOYB','PDBC','DBO','DBB'],
}

const TICKER_NAMES: Record<string, string> = {
  'AAPL':'Apple','ABNB':'Airbnb','ADBE':'Adobe','ADI':'Analog Devices','ADP':'ADP',
  'ADSK':'Autodesk','AIG':'AIG','AMAT':'Applied Materials','AMD':'AMD','AMGN':'Amgen',
  'AMZN':'Amazon','ANET':'Arista Networks','ARM':'ARM Holdings','ASML':'ASML',
  'AVGO':'Broadcom','AXP':'American Express','AZN':'AstraZeneca','BA':'Boeing',
  'BABA':'Alibaba','BAC':'Bank of America','BIIB':'Biogen','BKNG':'Booking Holdings',
  'BLK':'BlackRock','BMY':'Bristol-Myers','BSX':'Boston Scientific',
  'C':'Citigroup','CAT':'Caterpillar','CDNS':'Cadence','CEG':'Constellation Energy',
  'CL':'Colgate','CMCSA':'Comcast','COP':'ConocoPhillips','COST':'Costco',
  'CRM':'Salesforce','CRWD':'CrowdStrike','CSCO':'Cisco','CVS':'CVS Health',
  'CVX':'Chevron','DE':'Deere','DHR':'Danaher','DIS':'Disney',
  'DXCM':'DexCom','EA':'Electronic Arts','ENPH':'Enphase','EQIX':'Equinix',
  'ETN':'Eaton','F':'Ford','FAST':'Fastenal','FTNT':'Fortinet',
  'GE':'GE Aerospace','GILD':'Gilead','GM':'General Motors','GOOG':'Alphabet',
  'GS':'Goldman Sachs','HD':'Home Depot','HON':'Honeywell','HPQ':'HP',
  'IBM':'IBM','IDXX':'IDEXX','INTC':'Intel','INTU':'Intuit','ISRG':'Intuitive Surgical',
  'JNJ':'Johnson & Johnson','JPM':'JPMorgan','KO':'Coca-Cola','LIN':'Linde',
  'LLY':'Eli Lilly','LMT':'Lockheed Martin','LOW':"Lowe's",'MA':'Mastercard',
  'MCD':"McDonald's",'MDLZ':'Mondelez','MDT':'Medtronic','META':'Meta',
  'MMM':'3M','MO':'Altria','MRK':'Merck','MS':'Morgan Stanley',
  'MSFT':'Microsoft','MU':'Micron','NEE':'NextEra Energy','NET':'Cloudflare',
  'NFLX':'Netflix','NKE':'Nike','NOW':'ServiceNow','NVDA':'Nvidia',
  'NXPI':'NXP Semiconductors','ORCL':'Oracle','PANW':'Palo Alto Networks','PAYX':'Paychex',
  'PDD':'PDD Holdings','PEP':'PepsiCo','PFE':'Pfizer','PG':'Procter & Gamble',
  'PLTR':'Palantir','PM':'Philip Morris','PYPL':'PayPal','QCOM':'Qualcomm',
  'REGN':'Regeneron','ROP':'Roper Technologies','ROST':'Ross Stores','SBUX':'Starbucks',
  'SHOP':'Shopify','SMCI':'Super Micro Computer','SNAP':'Snap','SNOW':'Snowflake',
  'SOFI':'SoFi','SQ':'Block','T':'AT&T',
  'TGT':'Target','TMO':'Thermo Fisher','TMUS':'T-Mobile','TSLA':'Tesla',
  'TXN':'Texas Instruments','UBER':'Uber','UNH':'UnitedHealth','UPS':'UPS',
  'V':'Visa','VZ':'Verizon','WMT':'Walmart','XPEV':'XPeng','XOM':'ExxonMobil',
  'ZM':'Zoom','ROKU':'Roku','ZS':'Zscaler',
  'HOOD':'Robinhood','MSTR':'MicroStrategy','RIVN':'Rivian','RDDT':'Reddit',
  'COIN':'Coinbase','LCID':'Lucid','LYFT':'Lyft','NIO':'NIO',
  'PINS':'Pinterest','RBLX':'Roblox','AFRM':'Affirm','AI':'C3.ai',
  'DASH':'DoorDash','DDOG':'Datadog','GME':'GameStop','MRNA':'Moderna','PATH':'UiPath',
  'SPY':'S&P 500 ETF','QQQ':'Nasdaq 100 ETF','IWM':'Russell 2000 ETF',
  'DIA':'Dow Jones ETF','VTI':'Total Market ETF','VOO':'Vanguard S&P 500',
  'XLE':'Energy ETF','XLF':'Financials ETF','XLK':'Tech ETF','XLV':'Healthcare ETF',
  'XLY':'Consumer Discr. ETF','XLI':'Industrials ETF','SMH':'Semiconductors ETF',
  'ARKK':'ARK Innovation ETF','TLT':'20Y Treasury ETF','HYG':'High Yield Bond ETF',
  'GDX':'Gold Miners ETF','EFA':'Intl Developed ETF','EEM':'Emerging Markets ETF',
  'GLD':'Gold ETF','SLV':'Silver ETF','USO':'Oil ETF','CORN':'Corn ETF','WEAT':'Wheat ETF',
}

const ALL_TICKERS = Array.from(new Set(Object.values(STATIC_UNIVERSE).flat())).sort()

// ETF Dictionary with full name and ISIN
const ETF_INFO: Record<string, { name: string; isin: string }> = {
  'XLV': { name: 'SPDR Health Care Select Sector ETF', isin: 'US78462F1030' },
  'SPY': { name: 'SPDR S&P 500 ETF Trust', isin: 'US78462F1030' },
  'QQQ': { name: 'Invesco QQQ Trust', isin: 'US46090E1038' },
  'IWM': { name: 'iShares Russell 2000 ETF', isin: 'US4642876555' },
  'GLD': { name: 'SPDR Gold Shares', isin: 'US78463V1070' },
  'SLV': { name: 'iShares Silver Trust', isin: 'US46428Q1094' },
  'USO': { name: 'United States Oil Fund', isin: 'US9123181093' },
  'XLE': { name: 'Energy Select Sector SPDR Fund', isin: 'US81369Y5069' },
  'XLF': { name: 'Financial Select Sector SPDR Fund', isin: 'US81369Y2843' },
  'XLK': { name: 'Technology Select Sector SPDR Fund', isin: 'US81369Y6974' },
  'SOXX': { name: 'iShares Semiconductor ETF', isin: 'US4642887923' },
  'ARKK': { name: 'ARK Innovation ETF', isin: 'US00214Q1040' },
  'VTI': { name: 'Vanguard Total Stock Market ETF', isin: 'US9229087690' },
  'VOO': { name: 'Vanguard S&P 500 ETF', isin: 'US9229083632' },
  'VEA': { name: 'Vanguard FTSE Developed Markets ETF', isin: 'US9219097683' },
  'EEM': { name: 'iShares MSCI Emerging Markets ETF', isin: 'US4642872349' },
  'TLT': { name: 'iShares 20+ Year Treasury Bond ETF', isin: 'US4642874329' },
  'HYG': { name: 'iShares iBoxx High Yield Corporate Bond ETF', isin: 'US4642885135' },
  'XBI': { name: 'SPDR S&P Biotech ETF', isin: 'US78464A8707' },
  'SMH': { name: 'VanEck Semiconductor ETF', isin: 'US92189F1066' },
}

function smartFilter(query: string, pool: string[], exclude: string[]): string[] {
  if (!query) return pool.filter(t => !exclude.includes(t))
  const q = query.toUpperCase()
  const startsWith = pool.filter(t => t.startsWith(q) && !exclude.includes(t))
  const contains = pool.filter(t => !t.startsWith(q) && t.includes(q) && !exclude.includes(t))
  return [...startsWith, ...contains]
}

// ── CS Candidate Score ────────────────────────────────────────────────────────

export function computeCandidateScore(r: ScanResult): number {
  // Delta: linear 0→100 from delta=0.20 to delta=0.50 (CS targets 0.40-0.60)
  const deltaScore    = Math.max(0, Math.min((r.delta - 0.20) / 0.30, 1)) * 100
  const dteScore      = Math.min(r.dte / 730, 1) * 100
  const rawLiquidity  = Math.max(0, 1 - r.spread_pct / 100) * 60 + Math.min(r.open_interest / 500, 1) * 40
  // OI < 100 = illiquid regardless of spread
  const liquidityScore = r.open_interest < 100 ? Math.min(rawLiquidity, 39) : rawLiquidity
  // Vega: 0→100 linear, good ≥0.5, excellent ≥1.0
  const vegaScore     = Math.min(r.vega / 1.0, 1) * 100
  const raw = Math.round(vegaScore * 0.35 + dteScore * 0.30 + liquidityScore * 0.20 + deltaScore * 0.15)
  // CS strategy requires LEAPS: hard cap at 69 for DTE < 300 (theta too costly)
  return r.dte < 300 ? Math.min(raw, 69) : raw
}

export function computeWhyPanel(r: ScanResult): string[] {
  // Same formulas as computeCandidateScore
  const deltaScore    = Math.max(0, Math.min((r.delta - 0.20) / 0.30, 1)) * 100
  const dteScore      = Math.min(r.dte / 730, 1) * 100
  const rawLiquidity  = Math.max(0, 1 - r.spread_pct / 100) * 60 + Math.min(r.open_interest / 500, 1) * 40
  const liquidityScore = r.open_interest < 100 ? Math.min(rawLiquidity, 39) : rawLiquidity
  // Vega: good ≥0.5, excellent ≥1.0 (absolute vega value)
  const vegaScore     = Math.min(r.vega / 1.0, 1) * 100
  return [
    deltaScore > 75 ? 'Excellent Delta (≥0.45)'      : deltaScore > 60 ? 'Good Delta (≥0.40)'       : 'Poor Delta (<0.40)',
    liquidityScore > 75 ? 'Excellent Liquidity'      : liquidityScore > 40 ? 'Good Liquidity (OI≥100)' : 'Poor Liquidity (OI<100)',
    dteScore      > 75 ? 'Excellent DTE (LEAPS)'     : dteScore      > 40 ? 'Good DTE'              : 'Short DTE — capped',
    r.vega >= 1.0 ? 'Excellent Vega (≥1.0)'          : r.vega >= 0.5 ? 'Good Vega (≥0.5)'           : 'Poor Vega (<0.5)',
  ]
}

function scoreColor(score: number): string {
  if (score > 75) return '#00DD00'
  if (score >= 70) return '#FFAA00'
  return '#FF3333'
}

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [targetWl, setTargetWl] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [assetClass, setAssetClass] = useState<string>('')
  const [selectedTickers, setSelectedTickers] = useState<string[]>([])
  const [tickerSearch, setTickerSearch] = useState('')
  const [optionType, setOptionType] = useState('call')
  const [dteMin, setDteMin] = useState('300')
  const [dteMax, setDteMax] = useState('750')
  const [deltaMin, setDeltaMin] = useState('0.20')
  const [deltaMax, setDeltaMax] = useState('0.45')
  const [showIvrHeaderTooltip, setShowIvrHeaderTooltip] = useState(false)
  const [showScoreHeaderTooltip, setShowScoreHeaderTooltip] = useState(false)
  const [hoveredScoreKey, setHoveredScoreKey] = useState<string | null>(null)

  // Nuovi filtri frontend
  const [strikeMin, setStrikeMin] = useState('')
  const [strikeMax, setStrikeMax] = useState('')
  const [ivMin, setIvMin] = useState('')
  const [ivMax, setIvMax] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const searchRef = useRef<HTMLInputElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scannedTickers, setScannedTickers] = useState<string[]>([])
  const [view, setView] = useState<'scanner' | 'surface'>('scanner')
  const [surfaceTicker, setSurfaceTicker] = useState<string>('')
  const [etfInfo, setEtfInfo] = useState<Record<string, { name: string; isin: string | null }>>({})
  const [stockPrices, setStockPrices] = useState<Record<string, number | null>>({})

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('')
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  // Track if filters have been loaded from localStorage
  const [filtersLoadedFromStorage, setFiltersLoadedFromStorage] = useState(false)
  // Track if we've already processed the initial store state
  const initialStoreSyncDone = useRef(false)
  // Track if we're currently loading from localStorage (to prevent handleAssetClass from resetting)
  const isLoadingFromStorage = useRef(false)
  // Enable saving to localStorage only after initial mount is complete
  const enableSaving = useRef(false)

  // API-loaded ticker universe (fetched at mount, cached)
  const [apiUniverse, setApiUniverse] = useState<Record<string, string[]> | null>(null)
  const [apiTickersLoading, setApiTickersLoading] = useState(false)

  const handleAssetClass = (cat: string) => {
    console.log('[SCANNER DEBUG] handleAssetClass called, resetting selectedTickers to []', {
      oldValue: selectedTickers,
      newCategory: cat,
      stackTrace: new Error().stack
    })
    setAssetClass(cat)
    setSelectedTickers([])
    setTickerSearch('')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  // Use STATIC_UNIVERSE for categories (frontend keys: stocks, etf, indici, commodities)
  // Use API universe only for the "all" list to expand ticker coverage
  const allTickersArray = apiUniverse?.all || ALL_TICKERS
  const pool = assetClass ? (STATIC_UNIVERSE[assetClass] ?? []) : allTickersArray
  const filteredTickers = smartFilter(tickerSearch, pool, selectedTickers)

  const addTicker = (t: string) => {
    console.log('[SCANNER DEBUG] addTicker called, setting selectedTickers to:', [t])
    setSelectedTickers([t])  // Solo UN ticker alla volta
    setTickerSearch('')
    searchRef.current?.focus()
    setDropdownOpen(true)
  }

  const removeTicker = (t: string) => {
    console.log('[SCANNER DEBUG] removeTicker called for:', t)
    setSelectedTickers(prev => prev.filter(x => x !== t))
  }

  useEffect(() => {
    // Load ticker universe from API (cached)
    const loadTickerUniverse = async () => {
      setApiTickersLoading(true)
      try {
        const res = await fetch('/api/scanner/universe', {
          credentials: 'include'
        })
        const data = await res.json()
        if (data.by_category) {
          setApiUniverse(data.by_category)
          console.log('[SCANNER] Loaded ticker universe from API:', Object.keys(data.by_category).length, 'categories')
        }
      } catch (error) {
        console.warn('[SCANNER] Failed to load ticker universe from API, using static fallback:', error)
      } finally {
        setApiTickersLoading(false)
      }
    }
    loadTickerUniverse()

    // Load watchlists on mount
    const loadWatchlists = async () => {
      try {
        const res = await fetch('/api/watchlists')
        const data = await res.json()
        if (data.ok) setWatchlists(data.watchlists)
      } catch {
        // Ignore error
      }
    }
    loadWatchlists()

    // Load saved filters from localStorage
    try {
      const saved = localStorage.getItem('scanner_filters')
      if (saved) {
        isLoadingFromStorage.current = true
        const filters = JSON.parse(saved)
        console.log('[SCANNER MOUNT] Loaded from localStorage:', filters)

        // Set all filters in batch to prevent race conditions
        if (filters.selectedTickers && Array.isArray(filters.selectedTickers)) {
          console.log('[SCANNER MOUNT] Restored selectedTickers from localStorage:', filters.selectedTickers)
          setSelectedTickers(filters.selectedTickers)
        } else {
          console.log('[SCANNER MOUNT] No selectedTickers in localStorage, keeping empty []')
        }
        if (filters.assetClass) setAssetClass(filters.assetClass)
        if (filters.optionType) setOptionType(filters.optionType)
        if (filters.dteMin) setDteMin(filters.dteMin)
        if (filters.dteMax) setDteMax(filters.dteMax)
        if (filters.deltaMin) setDeltaMin(filters.deltaMin)
        if (filters.deltaMax) setDeltaMax(filters.deltaMax)
        if (filters.strikeMin !== undefined) setStrikeMin(filters.strikeMin)
        if (filters.strikeMax !== undefined) setStrikeMax(filters.strikeMax)
        if (filters.ivMin !== undefined) setIvMin(filters.ivMin)
        if (filters.ivMax !== undefined) setIvMax(filters.ivMax)

        // Restore scanner results if available
        if (filters.results && Array.isArray(filters.results)) {
          console.log('[SCANNER MOUNT] Restored results:', filters.results.length, 'contracts')
          setResults(filters.results)
        }
        if (filters.scannedTickers && Array.isArray(filters.scannedTickers)) {
          setScannedTickers(filters.scannedTickers)
        }

        setFiltersLoadedFromStorage(true)
        // Reset flag after a tick to allow React to batch updates
        setTimeout(() => {
          isLoadingFromStorage.current = false
          // Enable saving only after mount is complete and filters are restored
          enableSaving.current = true
        }, 100)
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    setFiltersLoadedFromStorage(true)
    // If no saved filters, enable saving immediately
    if (!localStorage.getItem('scanner_filters')) {
      enableSaving.current = true
    }
  }, [])

  // Debug: log selectedTickers changes
  useEffect(() => {
    console.log('[SCANNER] selectedTickers changed:', selectedTickers)
  }, [selectedTickers])

  // Save filters AND results to localStorage whenever they change
  useEffect(() => {
    // Skip saving during initial mount/load from localStorage
    if (!enableSaving.current) {
      console.log('[SCANNER] Skipping localStorage save - saving not enabled yet')
      return
    }

    console.log('[SCANNER] Saving to localStorage, selectedTickers:', selectedTickers)
    try {
      const filters = {
        assetClass,
        selectedTickers,
        optionType,
        dteMin,
        dteMax,
        deltaMin,
        deltaMax,
        strikeMin,
        strikeMax,
        ivMin,
        ivMax,
        results,
        scannedTickers,
      }
      localStorage.setItem('scanner_filters', JSON.stringify(filters))
    } catch {
      // Ignore localStorage errors
    }
  }, [assetClass, selectedTickers, optionType, dteMin, dteMax, deltaMin, deltaMax, strikeMin, strikeMax, ivMin, ivMax, results, scannedTickers])

  // Ascolta risultati dallo scanner AI
  useEffect(() => {
    return scannerStore.subscribe(({ results, filters }) => {
      console.log('[SCANNER STORE] Subscribe called:', {
        resultsLength: results?.length,
        filters,
        initialSyncDone: initialStoreSyncDone.current
      })

      // Skip the first store sync on mount - we want localStorage filters to win
      if (!initialStoreSyncDone.current) {
        console.log('[SCANNER STORE] Skipping initial sync')
        initialStoreSyncDone.current = true
        return
      }

      // Only update when scanner AI sends NEW results (not stale ones from previous session)
      if (results && Array.isArray(results) && results.length > 0) {
        console.log('[SCANNER STORE] Applying results from AI')
        const f = filters as any
        // Popola i risultati
        setResults(results as ScanResult[])
        // Popola i filtri usati per la scansione - SOLO se underlyings è presente e non vuoto
        if (f?.underlyings && Array.isArray(f.underlyings) && f.underlyings.length > 0) {
          console.log('[SCANNER STORE] Setting selectedTickers to:', f.underlyings)
          setSelectedTickers(f.underlyings)
          setScannedTickers(f.underlyings)
        } else {
          console.log('[SCANNER STORE] NOT setting selectedTickers - underlyings is empty/undefined:', f?.underlyings)
        }
        setOptionType(f?.option_type || 'call')
        setDteMin(f?.dte_min?.toString() || '300')
        setDteMax(f?.dte_max?.toString() || '750')
        setDeltaMin(f?.delta_min?.toString() || '0.20')
        setDeltaMax(f?.delta_max?.toString() || '0.45')
        // Scroll in cima
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }, [])

  // Fetch stock prices when scannedTickers changes
  useEffect(() => {
    if (scannedTickers.length === 0) return

    const fetchPrices = async () => {
      const prices: Record<string, number | null> = {}

      for (const ticker of scannedTickers) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/public/stock-price/${ticker}`)
          const data = await res.json()
          prices[ticker] = data.last_price
        } catch {
          prices[ticker] = null
        }
      }

      setStockPrices(prices)
    }

    fetchPrices()
  }, [scannedTickers])

  const runScan = async () => {
    console.log('[SCANNER] RUN clicked, tickers:', selectedTickers)
    console.log('[SCANNER] option_type:', optionType)

    if (selectedTickers.length === 0) {
      setError('SELECT AT LEAST ONE TICKER')
      return
    }

    // Clear results FIRST to force React to unmount existing rows
    setResults([])
    setSelected(new Set())

    setLoading(true)
    setError(null)
    setHasScanned(true)  // Mark that we've run at least one scan
    setDropdownOpen(false)
    searchRef.current?.blur()
    setScannedTickers([...selectedTickers])
    try {
      const body: Record<string, unknown> = {
        underlyings: selectedTickers,
        option_type: optionType,
        dte_min: Number(dteMin),
        dte_max: Number(dteMax),
        delta_min: Number(deltaMin),
        delta_max: Number(deltaMax),
      }

      // Add optional strike filters
      if (strikeMin && strikeMin.trim() !== '') {
        body.strike_min = Number(strikeMin)
      }
      if (strikeMax && strikeMax.trim() !== '') {
        body.strike_max = Number(strikeMax)
      }

      console.log('[SCANNER] Request body:', body)
      console.log('[SCANNER] RUN clicked, sending request with:', JSON.stringify(body))
      console.log('[SCANNER] Fetching /api/scanner/run...')

      const res = await fetch('/api/scanner/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      console.log('[SCANNER] Fetch completed, status:', res.status, 'ok:', res.ok)
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Scan failed')
      setResults(data.results)

      // Merge ticker names from backend with static ETF info
      const etfData: Record<string, { name: string; isin: string | null }> = {}

      for (const ticker of selectedTickers) {
        if (ETF_INFO[ticker]) {
          // Use static ETF info (includes ISIN)
          etfData[ticker] = ETF_INFO[ticker]
        } else if (data.ticker_names && data.ticker_names[ticker]) {
          // Use name from backend
          etfData[ticker] = { name: data.ticker_names[ticker], isin: null }
        }
      }

      setEtfInfo({...etfData})

      const wlRes = await fetch('/api/watchlists')
      const wlData = await wlRes.json()
      if (wlData.ok) setWatchlists(wlData.watchlists)
    } catch (e: unknown) {
      console.error('[SCANNER] Error in runScan:', e)
      console.error('[SCANNER] Error type:', typeof e)
      if (e instanceof Error) {
        console.error('[SCANNER] Error message:', e.message)
        console.error('[SCANNER] Error stack:', e.stack)
      }
      setError(e instanceof Error ? e.message : 'ERROR')
    } finally {
      console.log('[SCANNER] runScan finished, loading:', false)
      setLoading(false)
    }
  }

  const toggleResult = (key: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })

  const openAddModal = () => {
    if (selected.size === 0) return
    setShowModal(true)
    setSelectedWatchlist('')
    setNewWatchlistName('')
    setCreatingNew(false)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedWatchlist('')
    setNewWatchlistName('')
    setCreatingNew(false)
  }

  const createWatchlistAndAdd = async () => {
    if (!newWatchlistName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      })
      const data = await res.json()
      if (data.ok && data.watchlist) {
        await addContractsToWatchlist(data.watchlist.id, data.watchlist.name)
        const wlRes = await fetch('/api/watchlists')
        const wlData = await wlRes.json()
        if (wlData.ok) setWatchlists(wlData.watchlists)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create watchlist')
    } finally {
      setSaving(false)
    }
  }

  const addToExistingWatchlist = async () => {
    if (!selectedWatchlist) return
    const wl = watchlists.find(w => w.id === selectedWatchlist)
    if (!wl) return
    await addContractsToWatchlist(selectedWatchlist, wl.name)
  }

  const addContractsToWatchlist = async (watchlistId: string, watchlistName: string) => {
    setSaving(true)
    setSavedMsg('')
    const toSave = results.filter(r => selected.has(r.symbol_key))
    let ok = 0
    for (const r of toSave) {
      const res = await fetch('/api/scanner/add-to-watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: r, watchlist_id: Number(watchlistId), quantity: 1 }),
      })
      if (res.ok) ok++
    }
    setSaving(false)
    setSavedMsg(`${ok}/${toSave.length} contract(s) added to ${watchlistName}`)
    setSelected(new Set())
    closeModal()
    setTimeout(() => setSavedMsg(''), 4000)
  }

  // Sorting logic
  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Apply frontend filters and sorting
  const getFilteredAndSortedResults = () => {
    let filtered = [...results]

    // Frontend filters
    if (strikeMin) {
      const min = Number(strikeMin)
      filtered = filtered.filter(r => r.strike >= min)
    }
    if (strikeMax) {
      const max = Number(strikeMax)
      filtered = filtered.filter(r => r.strike <= max)
    }
    if (ivMin) {
      const min = Number(ivMin)
      filtered = filtered.filter(r => r.iv >= min)
    }
    if (ivMax) {
      const max = Number(ivMax)
      filtered = filtered.filter(r => r.iv <= max)
    }

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof ScanResult]
        let bVal: any = b[sortColumn as keyof ScanResult]

        // Handle special cases
        if (sortColumn === 'underlying') {
          aVal = a.underlying
          bVal = b.underlying
        } else if (sortColumn === 'expiration') {
          aVal = new Date(a.expiration).getTime()
          bVal = new Date(b.expiration).getTime()
        } else if (sortColumn === 'open_interest') {
          // Force numeric comparison for OI
          aVal = parseInt(String(a.open_interest || 0))
          bVal = parseInt(String(b.open_interest || 0))
        }

        if (aVal == null) return 1
        if (bVal == null) return -1

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      })
    }

    return filtered
  }

  const displayResults = getFilteredAndSortedResults()

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <ProtectedRoute>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isMobile ? '8px' : '16px', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace', fontSize: isMobile ? '12px' : '14.4px' }}>
      {/* Filter Panel */}
      <div style={{ marginBottom: '16px', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '16px' }}>
        <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '12px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '6px' }}>
          SCANNER FILTERS
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
          {/* Asset Class */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            ASSET CLASS
            <select value={assetClass} onChange={e => handleAssetClass(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 8px', fontSize: '13.2px', fontFamily: 'inherit', width: '140px' }}>
              <option value="">— SELECT —</option>
              {Object.keys(CATEGORY_LABELS).map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </label>

          {/* Ticker Multi-Select */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px', flex: isMobile ? '1 1 100%' : '1 1 auto' }}>
            TICKER
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px',
                backgroundColor: bb.panel, border: `1px solid ${assetClass ? bb.border2 : bb.border}`,
                padding: '4px 6px', opacity: assetClass ? 1 : 0.5
              }}>
                {selectedTickers.map(t => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: bb.orange, color: '#000', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>
                    {t}
                    <button onClick={() => removeTicker(t)} style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '16.8px' }}>×</button>
                  </span>
                ))}
                <input
                  ref={searchRef}
                  value={tickerSearch}
                  onChange={e => { setTickerSearch(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  placeholder={assetClass ? 'TYPE TO SEARCH...' : 'SEARCH TICKER (EX. AAPL)'}
                  style={{ flex: '1 1 120px', minWidth: '120px', backgroundColor: 'transparent', border: 'none', color: bb.orange, fontSize: '13.2px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              {dropdownOpen && filteredTickers.length > 0 && (
                <div style={{ position: 'absolute', left: 0, top: '100%', zIndex: 20, marginTop: '4px', width: '100%', maxHeight: '200px', overflowY: 'auto', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px' }}>
                    {filteredTickers.slice(0, 40).map(t => {
                      const displayName = ETF_INFO[t]?.name || TICKER_NAMES[t]
                      return (
                        <button key={t} onMouseDown={(e) => { e.preventDefault(); addTicker(t) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: bb.panel, border: `1px solid ${bb.border}`, color: bb.white, padding: '4px 8px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = bb.orange, e.currentTarget.style.color = '#000')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = bb.panel, e.currentTarget.style.color = bb.white)}>
                          <span style={{ fontWeight: 'bold' }}>{t}</span>
                          {displayName && <span style={{ color: bb.gray, fontSize: '13px' }}>— {displayName}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {assetClass && selectedTickers.length === 0 && (
              <span style={{ fontSize: '12px', color: bb.amber }}>SELECT AT LEAST ONE TICKER</span>
            )}
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            TYPE
            <select value={optionType} onChange={e => setOptionType(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 8px', fontSize: '13.2px', fontFamily: 'inherit', width: '110px' }}>
              <option value="call">CALL</option>
              <option value="put">PUT</option>
              <option value="both">BOTH</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            DTE MIN
            <input type="number" value={dteMin} onChange={e => setDteMin(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '70px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            DTE MAX
            <input type="number" value={dteMax} onChange={e => setDteMax(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '70px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            DELTA MIN
            <input type="number" step="0.01" value={deltaMin} onChange={e => setDeltaMin(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '70px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            DELTA MAX
            <input type="number" step="0.01" value={deltaMax} onChange={e => setDeltaMax(e.target.value)}
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '70px' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            STRIKE MIN
            <input type="number" value={strikeMin} onChange={e => setStrikeMin(e.target.value)}
              placeholder="0"
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '80px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            STRIKE MAX
            <input type="number" value={strikeMax} onChange={e => setStrikeMax(e.target.value)}
              placeholder="∞"
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '80px' }} />
          </label>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            IV MIN %
            <input type="number" value={ivMin} onChange={e => setIvMin(e.target.value)}
              placeholder="0"
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '80px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>
            IV MAX %
            <input type="number" value={ivMax} onChange={e => setIvMax(e.target.value)}
              placeholder="∞"
              style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '13.2px', fontFamily: 'inherit', width: '80px' }} />
          </label>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                console.log('[SCANNER BUTTON] Clicked, view:', view, 'loading:', loading, 'tickers:', selectedTickers.length)
                try {
                  setView('scanner')
                  runScan()
                } catch (err) {
                  console.error('[SCANNER BUTTON] Error:', err)
                }
              }}
              disabled={loading || selectedTickers.length === 0}
              style={{
                backgroundColor: view === 'scanner' ? bb.orange : 'transparent',
                border: `1px solid ${bb.orange}`,
                color: view === 'scanner' ? '#000' : bb.orange,
                padding: '6px 12px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                cursor: (loading || selectedTickers.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || selectedTickers.length === 0) ? 0.4 : 1
              }}>
              {loading && view === 'scanner' ? 'SCANNING...' : '▶ RUN SCANNER'}
            </button>
            <button
              onClick={() => {
                if (selectedTickers.length === 0) return
                setSurfaceTicker(selectedTickers[0])
                setView('surface')
              }}
              disabled={selectedTickers.length === 0}
              style={{
                backgroundColor: view === 'surface' ? bb.amber : 'transparent',
                border: `1px solid ${bb.amber}`,
                color: view === 'surface' ? '#000' : bb.amber,
                padding: '6px 12px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                cursor: selectedTickers.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedTickers.length === 0 ? 0.4 : 1
              }}>
              📈 IV SURFACE
            </button>
          </div>
        </div>
      </div>

      {error && <div style={{ marginBottom: '12px', border: `1px solid ${bb.red}`, backgroundColor: '#1a0000', padding: '8px 12px', fontSize: '13.2px', color: bb.red }}>▶ ERROR: {error}</div>}

      {savedMsg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', border: `1px solid ${bb.green}`, backgroundColor: '#001a00' }}>
          <span style={{ fontSize: '13.2px', color: bb.green, letterSpacing: '1px' }}>✓ {savedMsg}</span>
        </div>
      )}

      {view === 'surface' && surfaceTicker && (
        <div style={{ marginBottom: '16px' }}>
          <VolSurface symbol={surfaceTicker} optionType={optionType} />
        </div>
      )}

      {view === 'scanner' && scannedTickers.length > 0 && results.length > 0 && (
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scannedTickers.map(t => {
            const info = etfInfo[t] || ETF_INFO[t]
            const contractCount = results.filter(r => r.underlying === t).length
            const displayedCount = displayResults.filter(r => r.underlying === t).length
            const price = stockPrices[t]
            return (
              <div key={t} style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', color: bb.gray, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: bb.orange }}>{t}</span>
                {info && (
                  <>
                    <span> · {info.name}</span>
                    {info.isin && <span> · ISIN: {info.isin}</span>}
                  </>
                )}
                <span> | </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: bb.orange, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1px' }}>LAST</span>
                  <span style={{ color: bb.white, fontFamily: 'Space Mono, monospace', fontSize: '14px', fontWeight: 'bold' }}>
                    {price !== undefined && price !== null ? `$${price.toFixed(2)}` : '--'}
                  </span>
                </span>
                <span> | </span>
                <span>
                  {displayedCount !== contractCount ? (
                    <>
                      <span style={{ color: bb.white, fontWeight: 'bold' }}>{displayedCount}</span>
                      <span style={{ color: bb.gray }}> of {contractCount}</span>
                      <span> CONTRACT{contractCount !== 1 ? 'S' : ''}</span>
                      <span style={{ color: bb.amber, marginLeft: '8px', fontSize: '11px' }}>(filtered)</span>
                    </>
                  ) : (
                    <span>{contractCount} CONTRACT{contractCount !== 1 ? 'S' : ''} FOUND</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {view === 'surface' ? null :
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', border: `1px solid ${bb.border2}` }}>
        <table style={{ width: '100%', minWidth: isMobile ? '900px' : undefined, borderCollapse: 'collapse', fontSize: isMobile ? '11px' : '13.2px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: bb.surface, color: bb.yellow, borderBottom: `1px solid ${bb.orange}` }}>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}></th>
              {[
                { label: 'TICKER', key: 'underlying' },
                { label: 'TYPE', key: 'option_type' },
                { label: 'STRIKE', key: 'strike' },
                { label: 'EXP', key: 'expiration' },
                { label: 'DTE', key: 'dte' },
                { label: 'BID', key: 'bid' },
                { label: 'ASK', key: 'ask' },
                { label: 'MID', key: 'mid' },
                { label: 'LAST', key: 'last_price' },
                { label: 'SPREAD%', key: 'spread_pct' },
              ].map(({ label, key }) => {
                const isActive = sortColumn === key
                const arrow = !isActive ? '↕' : sortDirection === 'asc' ? '▲' : '▼'
                return (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={{
                      padding: '6px 8px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      color: isActive ? bb.orange : bb.yellow,
                      userSelect: 'none'
                    }}>
                    {label} <span style={{ color: isActive ? bb.orange : '#444', fontSize: '10px' }}>{arrow}</span>
                  </th>
                )
              })}
              <th
                onClick={() => toggleSort('iv')}
                style={{
                  padding: '6px 8px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  cursor: 'help',
                  color: sortColumn === 'iv' ? bb.orange : bb.yellow,
                  userSelect: 'none'
                }}
                title="IV data: provided by market data feed where available. ▲ = calculated via Black-Scholes from mid price">
                IV <span style={{ color: sortColumn === 'iv' ? bb.orange : '#444', fontSize: '10px' }}>{sortColumn === 'iv' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
              <th
                style={{
                  padding: '6px 8px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  opacity: 0.5,
                  color: '#666',
                  position: 'relative',
                  cursor: 'help'
                }}
                onMouseEnter={() => setShowIvrHeaderTooltip(true)}
                onMouseLeave={() => setShowIvrHeaderTooltip(false)}>
                IVR
                {showIvrHeaderTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '0',
                    backgroundColor: '#000',
                    border: `1px solid ${bb.orange}`,
                    borderRadius: '4px',
                    padding: '8px 12px',
                    width: '220px',
                    zIndex: 100,
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '11px',
                    color: '#ccc',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    whiteSpace: 'normal',
                    textAlign: 'left',
                    fontWeight: 'normal',
                    letterSpacing: '0.5px'
                  }}>
                    <div style={{ color: bb.orange, fontWeight: 'bold', marginBottom: '4px' }}>
                      🔒 PRO FEATURE
                    </div>
                    <div style={{ lineHeight: '1.4' }}>
                      IV Rank requires 52-week historical options data. Available on the Pro plan.
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '20px',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${bb.orange}`
                    }} />
                  </div>
                )}
              </th>
              {[
                { label: 'DELTA', key: 'delta' },
                { label: 'VEGA', key: 'vega' },
                { label: 'THETA', key: 'theta' },
                { label: 'OI', key: 'open_interest' },
              ].map(({ label, key }) => {
                const isActive = sortColumn === key
                const arrow = !isActive ? '↕' : sortDirection === 'asc' ? '▲' : '▼'
                return (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={{
                      padding: '6px 8px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      color: isActive ? bb.orange : bb.yellow,
                      userSelect: 'none'
                    }}>
                    {label} <span style={{ color: isActive ? bb.orange : '#444', fontSize: '10px' }}>{arrow}</span>
                  </th>
                )
              })}
              {/* CS Candidate Score header */}
              <th
                style={{
                  padding: '6px 8px', textAlign: 'center', fontWeight: 'bold',
                  fontSize: '10.5px', letterSpacing: '0.8px', cursor: 'help',
                  color: bb.orange, position: 'relative', whiteSpace: 'nowrap',
                  borderLeft: `1px solid ${bb.border2}`,
                }}
                onMouseEnter={() => setShowScoreHeaderTooltip(true)}
                onMouseLeave={() => setShowScoreHeaderTooltip(false)}>
                COILED STRATEGY CANDIDATE SCORE
                {showScoreHeaderTooltip && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
                    backgroundColor: '#000', border: `1px solid ${bb.orange}`,
                    padding: '10px 14px', width: '260px', zIndex: 100,
                    fontFamily: 'Courier New, monospace', fontSize: '11px',
                    color: '#ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                    whiteSpace: 'normal', textAlign: 'left', fontWeight: 'normal',
                    letterSpacing: '0.5px', lineHeight: '1.5',
                  }}>
                    <div style={{ color: bb.orange, fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>
                      COILED STRATEGY CANDIDATE SCORE
                    </div>
                    <div>Measures structural quality of the contract: Vega Efficiency (35%) · DTE (30%) · Liquidity (20%) · Delta (15%).</div>
                    <div style={{ marginTop: '6px', color: bb.amber }}>
                      Not yet Opportunity Score — that requires historical IV data.
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', fontSize: '10px' }}>
                      <span style={{ color: '#00DD00' }}>■ &gt;75 Excellent</span>
                      <span style={{ color: '#FFAA00' }}>■ 70-75 Good</span>
                      <span style={{ color: '#FF3333' }}>■ &lt;70 Weak</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: '-6px', right: '20px', width: 0, height: 0,
                      borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                      borderTop: `6px solid ${bb.orange}` }} />
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: bb.bg }}>
            {results.length === 0 && !loading && !error && !hasScanned && (
              <tr><td colSpan={16} style={{ padding: '48px 16px', textAlign: 'center', color: bb.gray, fontSize: '13.2px', letterSpacing: '1px' }}>
                SELECT ASSET CLASS AND TICKER, THEN RUN SCAN
              </td></tr>
            )}
            {results.length === 0 && !loading && !error && hasScanned && (
              <tr><td colSpan={16} style={{ padding: '48px 16px', textAlign: 'center', fontSize: '13.2px', letterSpacing: '1px' }}>
                <div style={{ color: bb.amber, marginBottom: '8px', fontSize: '14.4px', fontWeight: 'bold' }}>
                  NO CONTRACTS FOUND FOR CURRENT FILTERS
                </div>
                <div style={{ color: bb.gray, fontSize: '12px' }}>
                  Try widening delta, strike or DTE range
                </div>
              </td></tr>
            )}
            {results.length === 0 && !loading && error && error.includes('No options data') && (
              <tr><td colSpan={16} style={{ padding: '32px 16px' }}>
                <div style={{
                  backgroundColor: bb.surface,
                  border: `1px solid ${bb.orange}`,
                  borderRadius: '4px',
                  padding: '20px 24px',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: 'Courier New, monospace',
                }}>
                  <div style={{
                    color: bb.orange,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    letterSpacing: '1px'
                  }}>
                    ⚠️ NO OPTIONS FOUND FOR THIS TICKER
                  </div>
                  <div style={{
                    color: bb.white,
                    fontSize: '13px',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                  }}>
                    The Coiled Spring Scanner displays options listed on US markets (CBOE/OCC) only.
                  </div>
                  <div style={{
                    color: bb.gray,
                    fontSize: '12px',
                    lineHeight: '1.5',
                    marginBottom: '8px',
                  }}>
                    European ETFs (UCITS), bonds, and non-US securities are not available.
                  </div>
                  <div style={{
                    color: bb.amber,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}>
                    Try US-listed tickers: SPY, QQQ, AAPL, NVDA, MSFT
                  </div>
                </div>
              </td></tr>
            )}
            {displayResults.map((r, idx) => {
              const isSelected = selected.has(r.symbol_key)
              return (
                <tr key={`${r.underlying}-${r.option_type}-${r.strike}-${r.expiration}-${idx}`}
                  onClick={() => toggleResult(r.symbol_key)}
                  style={{ borderBottom: `1px solid ${bb.border}`, backgroundColor: isSelected ? bb.panel : 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = bb.surface }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="checkbox" readOnly checked={isSelected} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', color: bb.orange }}>{r.underlying}</td>
                  <td style={{ padding: '6px 8px', color: bb.amber, textTransform: 'uppercase' }}>{r.option_type}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.strike}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.expiration}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.dte}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.bid}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.ask}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', color: bb.orange }}>{r.mid}</td>
                  <td style={{ padding: '6px 8px', color: bb.green }}>{r.last_price}</td>
                  <td style={{ padding: '6px 8px', color: r.spread_pct > 5 ? bb.amber : bb.white }}>{r.spread_pct}%</td>
                  <td style={{ padding: '6px 8px', color: r.iv < 5 ? bb.amber : bb.white }}>
                    {r.iv}%{r.iv < 5 && r.iv > 0 ? ' ⚠' : ''}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#444' }}>
                    —
                  </td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.delta}</td>
                  <td style={{ padding: '6px 8px', color: bb.white }}>{r.vega}</td>
                  <td style={{ padding: '6px 8px', color: bb.gray }}>{r.theta}</td>
                  <td style={{ padding: '6px 8px', color: bb.gray }}>{r.open_interest.toLocaleString()}</td>
                  {/* CS Candidate Score cell */}
                  <td style={{ padding: '6px 8px', textAlign: 'center', borderLeft: `1px solid ${bb.border2}`, position: 'relative' }}
                    onMouseEnter={() => setHoveredScoreKey(r.symbol_key)}
                    onMouseLeave={() => setHoveredScoreKey(null)}>
                    {(() => {
                      const score = computeCandidateScore(r)
                      const why = computeWhyPanel(r)
                      const color = scoreColor(score)
                      return (
                        <>
                          <span style={{
                            display: 'inline-block', minWidth: '36px',
                            fontWeight: 'bold', fontSize: '13px',
                            color, letterSpacing: '0.5px',
                          }}>{score}</span>
                          {hoveredScoreKey === r.symbol_key && (() => {
                            const showBelow = idx < 4
                            return (
                              <div style={{
                                position: 'absolute',
                                ...(showBelow
                                  ? { top: 'calc(100% + 6px)' }
                                  : { bottom: 'calc(100% + 6px)' }),
                                right: 0,
                                backgroundColor: '#000', border: `1px solid ${color}`,
                                padding: '8px 12px', zIndex: 200, minWidth: '200px',
                                fontFamily: 'Courier New, monospace', fontSize: '11px',
                                textAlign: 'left', whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.7)',
                              }}>
                                <div style={{ color, fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>
                                  WHY PANEL — {score}/100
                                </div>
                                {why.map((line, i) => (
                                  <div key={i} style={{ color: '#ccc', lineHeight: '1.6' }}>
                                    {line.startsWith('Excellent') || line.startsWith('High') ? '✓' : line.startsWith('Good') || line.startsWith('Medium') ? '·' : '✗'} {line}
                                  </div>
                                ))}
                                {/* Arrow indicator */}
                                {showBelow ? (
                                  <div style={{ position: 'absolute', top: '-6px', right: '20px', width: 0, height: 0,
                                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                                    borderBottom: `6px solid ${color}` }} />
                                ) : (
                                  <div style={{ position: 'absolute', bottom: '-6px', right: '20px', width: 0, height: 0,
                                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                                    borderTop: `6px solid ${color}` }} />
                                )}
                              </div>
                            )
                          })()}
                        </>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>}

      {/* Action Bar */}
      {view === 'scanner' && selected.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: bb.panel,
          border: `2px solid ${bb.orange}`,
          borderBottom: 'none',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 50
        }}>
          <span style={{ fontSize: '14.4px', color: bb.white, letterSpacing: '1px' }}>
            {selected.size} CONTRACT{selected.size > 1 ? 'S' : ''} SELECTED
          </span>
          <button
            onClick={openAddModal}
            style={{
              backgroundColor: bb.orange,
              color: '#000',
              border: 'none',
              padding: '8px 24px',
              fontSize: '14.4px',
              fontFamily: 'inherit',
              fontWeight: 'bold',
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = bb.amber)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = bb.orange)}>
            ADD TO WATCHLIST →
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }} onClick={closeModal}>
          <div
            style={{
              backgroundColor: bb.bg,
              border: `2px solid ${bb.orange}`,
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}>
            <div style={{
              color: bb.orange,
              fontSize: '16.8px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: `1px solid ${bb.border}`
            }}>
              ADD TO WATCHLIST
            </div>

            {watchlists.length === 0 && !creatingNew ? (
              // CASO 1: No watchlists
              <div>
                <p style={{ color: bb.gray, marginBottom: '16px' }}>You have no watchlists yet.</p>
                <button
                  onClick={() => setCreatingNew(true)}
                  style={{
                    backgroundColor: bb.orange,
                    color: '#000',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: '13.2px',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    width: '100%'
                  }}>
                  CREATE NEW WATCHLIST
                </button>
              </div>
            ) : creatingNew ? (
              // CASO 3: Create new
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>WATCHLIST NAME:</span>
                  <input
                    type="text"
                    value={newWatchlistName}
                    onChange={e => setNewWatchlistName(e.target.value)}
                    placeholder="Enter name..."
                    autoFocus
                    style={{
                      backgroundColor: bb.panel,
                      border: `1px solid ${bb.border2}`,
                      color: bb.orange,
                      padding: '8px 12px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit'
                    }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setCreatingNew(false); setNewWatchlistName('') }}
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${bb.border2}`,
                      color: bb.gray,
                      padding: '8px 16px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      flex: 1
                    }}>
                    CANCEL
                  </button>
                  <button
                    onClick={createWatchlistAndAdd}
                    disabled={!newWatchlistName.trim() || saving}
                    style={{
                      backgroundColor: (!newWatchlistName.trim() || saving) ? bb.border2 : bb.green,
                      color: '#000',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      cursor: (!newWatchlistName.trim() || saving) ? 'not-allowed' : 'pointer',
                      flex: 2
                    }}>
                    {saving ? 'CREATING...' : 'CREATE AND ADD →'}
                  </button>
                </div>
              </div>
            ) : (
              // CASO 2: Select existing
              <div>
                <p style={{ color: bb.gray, marginBottom: '12px', fontSize: '13.2px' }}>Select a watchlist:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                  {watchlists.map(w => (
                    <label
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: selectedWatchlist === w.id ? bb.surface : bb.panel,
                        border: `1px solid ${selectedWatchlist === w.id ? bb.orange : bb.border2}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedWatchlist(w.id)}>
                      <input
                        type="radio"
                        name="watchlist"
                        value={w.id}
                        checked={selectedWatchlist === w.id}
                        onChange={() => setSelectedWatchlist(w.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: bb.orange, fontSize: '13.2px', letterSpacing: '0.5px' }}>{w.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setCreatingNew(true)}
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${bb.border2}`,
                    color: bb.amber,
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: '16px'
                  }}>
                  + CREATE NEW WATCHLIST
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={closeModal}
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${bb.border2}`,
                      color: bb.gray,
                      padding: '8px 16px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      flex: 1
                    }}>
                    CANCEL
                  </button>
                  <button
                    onClick={addToExistingWatchlist}
                    disabled={!selectedWatchlist || saving}
                    style={{
                      backgroundColor: (!selectedWatchlist || saving) ? bb.border2 : bb.green,
                      color: '#000',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      cursor: (!selectedWatchlist || saving) ? 'not-allowed' : 'pointer',
                      flex: 2
                    }}>
                    {saving ? 'ADDING...' : 'ADD →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  )
}
