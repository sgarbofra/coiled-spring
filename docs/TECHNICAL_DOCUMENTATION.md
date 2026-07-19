# Coiled Spring Terminal — Documentazione Tecnica
**Ultimo aggiornamento:** 16 luglio 2026  
**Branch:** `master` | **Backend:** Railway (`api.coiledspring.app`) | **Frontend:** Vercel

---

## 1. Architettura del sistema di temi (CSS Variables)

### 1.1 Design del sistema

Il terminale supporta due temi — **Night** (default) e **Day** — gestiti interamente tramite CSS custom properties. Nessun colore hardcoded nei componenti React: tutto passa da variabili CSS.

**File principale:** `frontend-next/app/globals.css`

```css
/* Night mode — default (:root) */
:root {
  --bg-primary:     #0d1117;   /* sfondo pagina */
  --bg-panel:       #161b22;   /* card / pannelli */
  --bg-hover:       #1c2128;   /* hover stato tabelle */
  --accent:         #e87722;   /* arancio Coiled Spring */
  --accent-dim:     rgba(232, 119, 34, 0.15);
  --text-primary:   #e6edf3;
  --text-secondary: #8b949e;
  --text-tertiary:  #484f58;
  --border:         #30363d;
  --positive:       #3fb950;   /* verde P&L positivo */
  --negative:       #f85149;   /* rosso P&L negativo */
  --font-mono:      'JetBrains Mono', monospace;
  --font-sans:      'Inter', sans-serif;
}

/* Day mode — attivato da body.day-mode */
body.day-mode {
  --bg-primary:     #f1f5f9;
  --bg-panel:       #ffffff;
  --bg-hover:       #e2e8f0;
  --accent:         #2563eb;   /* blu day mode */
  --accent-dim:     rgba(37, 99, 235, 0.12);
  --text-primary:   #0f172a;
  --text-secondary: #64748b;
  --text-tertiary:  #94a3b8;
  --border:         #e2e8f0;
  --positive:       #16a34a;
  --negative:       #dc2626;
}
```

### 1.2 Meccanismo di toggle tema

**File:** `frontend-next/components/NavBar.tsx`

Il toggle applica/rimuove la classe `day-mode` da `document.body`. Il cambio viene persistito in `localStorage` e riletto all'avvio.

```typescript
const toggleTheme = () => {
  const isDay = document.body.classList.toggle('day-mode')
  localStorage.setItem('theme', isDay ? 'day' : 'night')
}
```

### 1.3 Caso speciale: Plotly (VolSurface)

Plotly.js **non risolve CSS variables** nel suo motore di rendering — riceve le variabili come stringhe letterali invece dei valori hex. Per questo `VolSurface.tsx` usa palette statiche e un `MutationObserver` che rileva il cambio di classe su `document.body`.

**File:** `frontend-next/components/VolSurface.tsx`

```typescript
const DARK_PLOT  = { bg: '#0d1117', panel: '#161b22', text: '#e6edf3', grid: '#30363d', axis: '#8b949e' }
const LIGHT_PLOT = { bg: '#f1f5f9', panel: '#ffffff', text: '#0f172a', grid: '#cbd5e1', axis: '#475569' }

const [isDayMode, setIsDayMode] = useState(false)

useEffect(() => {
  const check = () => setIsDayMode(document.body.classList.contains('day-mode'))
  check()
  const obs = new MutationObserver(check)
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}, [])

const plt = isDayMode ? LIGHT_PLOT : DARK_PLOT
// plt.bg, plt.panel, plt.text, plt.grid, plt.axis usati nel layout Plotly
```

---

## 2. File modificati — Migrazione tema (sessione 16 luglio 2026)

### 2.1 Frontend — file tsx migrati da colori hardcoded a CSS variables

Tutti i file sotto sono stati migrati dalla palette Bloomberg hardcoded (`#000000`, `#1a1a2e`, ecc.) al sistema CSS variables. Pattern adottato in ogni file:

```typescript
const bb = {
  bg:      'var(--bg-primary)',
  surface: 'var(--bg-panel)',
  panel:   'var(--bg-panel)',
  border:  'var(--border)',
  border2: 'var(--border)',
  orange:  'var(--accent)',
  amber:   'var(--accent)',
  yellow:  'var(--accent)',
  green:   'var(--positive)',
  red:     'var(--negative)',
  white:   'var(--text-primary)',
  gray:    'var(--text-secondary)',
}
```

**File migrati:**
- `frontend-next/app/scanner/page.tsx`
- `frontend-next/app/portfolio/page.tsx`
- `frontend-next/app/watchlist/page.tsx`
- `frontend-next/components/VolSurface.tsx`
- `frontend-next/components/TradeModal.tsx`
- `frontend-next/components/AiChatPanel.tsx`
- + tutti gli altri moduli del terminale (28+ file totali)

### 2.2 Fix null bytes (TypeScript build failure)

Tre file contenevano null bytes `\x00` introdotti da un precedente script Python che usava `rb` (binary read). Questo causava `Invalid character` error sul build Vercel.

**Fix applicato:**
```python
data = open(file, 'rb').read().replace(b'\x00', b'').decode('utf-8')
```

File corretti: `portfolio/page.tsx`, `TradeModal.tsx`, `AiChatPanel.tsx`

---

## 3. Scanner — Day Mode UX Fixes (10 modifiche)

**File:** `frontend-next/app/scanner/page.tsx` + `frontend-next/app/globals.css`

| # | Modifica | Implementazione |
|---|----------|-----------------|
| 1 | Sfondo pagina chiaro | `var(--bg-primary)` = `#f1f5f9` |
| 2 | Card filtri visibili | `className="scanner-filters"` → card bianca con border |
| 3 | Inputs visibili | `.day-mode .filter-input { background: #fff; border: 1px solid #cbd5e1 }` |
| 4 | Tabella strutturata | header `#f8fafc`, righe alternate, hover `#e2e8f0` |
| 5 | Dati assenti espliciti | `<span className="data-empty">—</span>` per bid=0 o stale |
| 6 | CS Score arancio day | `.day-mode .cs-score-num { color: #ea580c }` |
| 7 | Info bar card | `className="scanner-info-bar"` → card con shadow |
| 8 | Checkbox custom | `.day-mode .scanner-checkbox { background: #fff; border: 1.5px solid #cbd5e1 }` |
| 9 | Ticker / Last leggibili | `className="info-ticker"` (blu) + `className="info-last"` (nero) |
| 10 | Header colonna compatta | `'CS SCORE'` (da `'COILED STRATEGY\nCANDIDATE SCORE'`) |

---

## 4. Backend — IV Snapshot (Implied Volatility History)

### 4.1 Architettura

Il sistema salva ogni giorno (16:30 UTC, dopo chiusura mercato US) la volatilità implicita ATM per 1107 ticker optionabili su 4 bucket DTE: 30, 60, 90, 180 giorni.

**Tabella DB:** `iv_history`
```sql
ticker     TEXT NOT NULL
date       DATE NOT NULL
dte_bucket INTEGER NOT NULL DEFAULT 30
iv_atm     FLOAT
PRIMARY KEY (ticker, date, dte_bucket)
```

**Scheduler:** `backend-python/main.py` — APScheduler AsyncIO
```python
scheduler.add_job(
    _run_daily_iv_snapshot,
    trigger="cron", hour=16, minute=30,
    id="daily_iv_snapshot", replace_existing=True
)
```

### 4.2 Fix porta dinamica Railway

**Problema:** la porta hardcoded `8080` non corrispondeva alla porta dinamica `$PORT` assegnata da Railway.

**Fix in `main.py`:**
```python
def _run_daily_iv_snapshot():
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")  # Railway $PORT dinamica
    resp = _requests.post(
        f"http://localhost:{port}/api/scanner/iv-snapshot",
        headers={"x-internal-key": key}, timeout=10
    )
```

### 4.3 Fix rate limiting Yahoo Finance (refactoring completo)

**Problema precedente:** `ThreadPoolExecutor(max_workers=3)` su batch da 50 ticker × 4 DTE = 200 request quasi simultanee. Ogni coppia `(ticker, DTE)` apriva una sessione `yf.Ticker` separata → 3-4 chiamate HTTP per coppia → `YFRateLimitError` massivo.

**Soluzione — `market_data.py`:**

```python
def _get_all_dte_ivs(symbol: str, dte_buckets: List[int]) -> Dict[int, Optional[float]]:
    """1 sessione yfinance per ticker — tutti i DTE in un unico fetch."""
    ticker_obj = yf.Ticker(symbol)          # 1 sola istanza
    spot = ticker_obj.fast_info.last_price  # 1 fetch spot
    expirations = ticker_obj.options        # 1 fetch lista scadenze
    chain_cache = {}                        # cache catene per expiry

    for target_dte in dte_buckets:
        best_exp = min(expirations, key=lambda e: abs(dte_dist(e, target_dte)))
        if best_exp not in chain_cache:
            chain_cache[best_exp] = ticker_obj.option_chain(best_exp)  # scaricata 1 volta
        # ATM strike lookup + IV extraction...
```

```python
def get_atm_iv_snapshot(tickers, dte_buckets=None):
    """Loop sequenziale puro — niente ThreadPoolExecutor."""
    TICKER_SLEEP = 1.5  # secondi tra ticker
    for i, ticker in enumerate(tickers):
        results[ticker] = _get_all_dte_ivs(ticker, dte_buckets)
        if (i + 1) % 50 == 0:
            print(f"[IV_SNAPSHOT] Progress: {i+1}/{len(tickers)} tickers processed")
        if i < len(tickers) - 1:
            time.sleep(TICKER_SLEEP + random.uniform(0.0, 0.5))
```

**Confronto:**

| | Prima | Dopo |
|---|---|---|
| Sessioni yfinance per ticker | 4 (una per DTE) | 1 |
| Parallelismo | 3 worker | 0 (sequenziale) |
| Sleep tra richieste | 8s tra batch da 50 | 1.5s tra ogni ticker |
| YFRateLimitError | Frequenti | Eliminati |
| Tempo totale 1107 ticker | ~20 min (con errori) | ~32 min (completo) |

### 4.4 Trigger manuale snapshot

```powershell
$key = "cs-cron-2026-secret"
Invoke-RestMethod -Uri "https://api.coiledspring.app/api/scanner/iv-snapshot" `
  -Method POST -Headers @{ "x-internal-key" = $key }
```

---

## 5. Note operative

### APScheduler e redeploy Railway
APScheduler è **in-memory** — ogni redeploy Railway (triggered da push GitHub) azzera lo scheduler. Il cron riparte correttamente al boot del nuovo container.

**Rischio:** un push durante la finestra 16:00-17:30 UTC interrompe lo snapshot in corso. Da fare: configurare Railway Watch Paths → `backend-python/**` per limitare i redeploy ai soli push backend.

### Ticker delisted nell'universo
Alcuni ticker nell'universo optionabile risultano delisted su Yahoo Finance (ESCO, EXPR, FARO, FI, FL, FLT, FTIV, GMS, ecc.). Vengono saltati silenziosamente con `iv_atm = None`. Da fare: pulizia periodica dell'universo rimuovendo i ticker non più trattabili.

### Google OAuth (da completare)
Aggiungere a Vercel environment variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`  
- `GOOGLE_REDIRECT_URI`

> ⚠️ **Security constraint:** queste credenziali non vanno MAI hardcoded — solo da env vars.
