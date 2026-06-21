// Store globale per comunicazione AI Chat → Scanner
type ScanResults = {
  results: unknown[]
  filters: unknown
  timestamp: number
}

let _pendingResults: ScanResults | null = null
const _listeners: Set<(data: ScanResults) => void> = new Set()

export const scannerStore = {
  dispatch(results: unknown[], filters: unknown) {
    const data = { results, filters, timestamp: Date.now() }
    _pendingResults = data
    _listeners.forEach(fn => fn(data))
  },

  subscribe(fn: (data: ScanResults) => void) {
    _listeners.add(fn)
    // Se ci sono risultati pendenti, invialo subito
    if (_pendingResults) {
      fn(_pendingResults)
      _pendingResults = null
    }
    return () => _listeners.delete(fn)
  }
}
