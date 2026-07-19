# Coiled Spring Terminal — Documentazione Funzionale
**Ultimo aggiornamento:** 16 luglio 2026

---

## 1. Sistema Temi: Night / Day Mode

### Descrizione
Il terminale supporta due modalità visive selezionabili dall'utente:

- **Night Mode** (default): palette scura GitHub Dark — sfondo `#0d1117`, testo chiaro, accento arancio `#e87722`. Ottimale per trading in ambienti a bassa luminosità e per lunghe sessioni davanti al monitor.
- **Day Mode**: palette chiara — sfondo `#f1f5f9`, testo scuro, accento blu `#2563eb`. Ottimale per ambienti luminosi o presentazioni.

### Comportamento
- Il toggle è nel menu di navigazione in alto a destra (icona ☀/🌙)
- La preferenza è persistita in `localStorage` — sopravvive al refresh della pagina
- Il cambio è istantaneo con transizione CSS da 0.25s
- Tutti i moduli del terminale (Scanner, Portfolio, Watchlist, HV Screener, ecc.) rispettano il tema selezionato
- La Volatility Surface (Plotly) si aggiorna in tempo reale al cambio tema tramite `MutationObserver`

### Colori funzionali per tema

| Elemento | Night | Day |
|---|---|---|
| Sfondo pagina | `#0d1117` | `#f1f5f9` |
| Card / Pannelli | `#161b22` | `#ffffff` |
| Testo principale | `#e6edf3` | `#0f172a` |
| Accento | `#e87722` (arancio) | `#2563eb` (blu) |
| Positivo (P&L +) | `#3fb950` (verde) | `#16a34a` (verde scuro) |
| Negativo (P&L −) | `#f85149` (rosso) | `#dc2626` (rosso scuro) |
| Border | `#30363d` | `#e2e8f0` |

---

## 2. HV Scanner (Options Scanner)

### Descrizione
Lo scanner principale del terminale. Mostra i candidati opzionali che soddisfano i criteri della strategia Coiled Spring: alta volatilità storica, bassa volatilità implicita relativa, e setup tecnico favorevole.

### Colonne principali

| Colonna | Descrizione |
|---|---|
| **TICKER** | Simbolo del titolo |
| **LAST** | Ultimo prezzo |
| **HV30** | Volatilità storica 30 giorni |
| **HV RANK** | Percentile HV rispetto agli ultimi 252 giorni |
| **HV PCT** | Percentile HV rispetto alla storia completa |
| **BID / ASK** | Spread opzione ATM selezionata |
| **IV** | Volatilità implicita ATM |
| **CS SCORE** | Punteggio composito strategia Coiled Spring (0–100) |

### CS Score
Il Coiled Spring Candidate Score (CS Score) è un punteggio proprietario che sintetizza la qualità del setup:

- **80–100**: Setup eccellente — alta priorità
- **60–79**: Setup buono — da monitorare
- **40–59**: Setup discreto — contesto dipendente
- **< 40**: Setup debole — evitare

Il punteggio è visualizzato come numero grande (36px) con barra di progressione sottostante. In Day Mode il colore è arancio bruciato `#ea580c` per massima leggibilità su sfondo bianco.

### Dati assenti
Quando bid = 0 o il dato è stale (non aggiornato di recente), la cella mostra `—` in grigio chiaro invece di `0` — chiarisce che il dato non è disponibile piuttosto che essere effettivamente zero.

### Filtri disponibili
- Range HV Rank (min/max)
- Range CS Score (min/max)
- Filtro ticker (ricerca testo)
- Toggle "Solo opzionabili"
- Checkbox "Escludi ETF"

---

## 3. IV History (Implied Volatility History)

### Descrizione
Il sistema raccoglie e storicizza ogni giorno la volatilità implicita ATM (at-the-money) per tutti i 1107 ticker dell'universo optionabile, su 4 orizzonti temporali (DTE bucket).

### DTE Bucket

| Bucket | Descrizione |
|---|---|
| **30 giorni** | IV ATM opzione più vicina a 30 gg a scadenza |
| **60 giorni** | IV ATM opzione più vicina a 60 gg a scadenza |
| **90 giorni** | IV ATM opzione più vicina a 90 gg a scadenza |
| **180 giorni** | IV ATM opzione più vicina a 180 gg a scadenza |

### Frequenza raccolta
- **Automatica:** ogni giorno alle 16:30 UTC (dopo chiusura mercato US) tramite APScheduler
- **Manuale:** endpoint `POST /api/scanner/iv-snapshot` con autenticazione `x-internal-key`

### Dati disponibili
- **Da:** 16 luglio 2026 (primo snapshot completo con il nuovo sistema)
- I dati dei giorni precedenti sono parziali a causa di problemi tecnici risolti oggi (porta hardcoded Railway + rate limiting Yahoo Finance)

### Utilizzo previsto
I dati IV history alimentano:
1. Il grafico della Volatility Surface (evoluzione IV nel tempo per DTE)
2. Il calcolo del IV Rank e IV Percentile storici
3. Segnali di mean-reversion sulla volatilità implicita

### Qualità dati
- Ticker delisted o senza opzioni restituiscono `None` e vengono saltati
- Univers cleanup periodico rimuoverà i ticker non più trattabili
- Dati validati: range 1% < IV < 500% (fuori range → scartati)

---

## 4. Volatility Surface

### Descrizione
Grafico 3D interattivo (Plotly) che visualizza la superficie di volatilità implicita per un titolo selezionato: asse X = strike, asse Y = scadenza (DTE), asse Z = IV implicita.

### Comportamento tema
La surface è l'unico componente che non può usare CSS variables direttamente (limitazione Plotly). Usa palette statiche hard-coded per Night e Day mode, sincronizzate in tempo reale con il tema attivo tramite `MutationObserver`.

---

## 5. Portfolio

### Descrizione
Modulo di gestione del portafoglio opzioni personale. Permette di tracciare posizioni aperte, P&L in tempo reale, greche aggregate e gestione delle coperture.

### Funzionalità principali
- Aggiunta posizioni manuale o da broker
- Calcolo P&L in tempo reale (ultimo prezzo × delta × leva)
- Greche aggregate per posizione e portafoglio totale
- Supporto multi-leg (spread, straddle, condor)
- AI Chat integrata per analisi di copertura e scenari

---

## 6. Watchlist

### Descrizione
Lista personalizzabile di ticker da monitorare. Mostra prezzi in tempo reale, variazione giornaliera e alert configurabili.

### Funzionalità
- Aggiunta/rimozione ticker
- Ordinamento per colonna
- Alert prezzo (sopra/sotto soglia)
- Note per ticker

---

## 7. HV Screener

### Descrizione
Screener dedicato alla volatilità storica. Classifica i ticker per HV30, HV Rank e HV Percentile per identificare i setup con compressione di volatilità più marcata.

### Aggiornamento dati
Snapshot HV calcolato ogni giorno alle 17:00 UTC (30 minuti dopo la chiusura mercato US) tramite APScheduler.

---

## 8. AI Chat (Coiled AI)

### Descrizione
Assistente AI integrato nel terminale, accessibile tramite il FAB (Floating Action Button) arancio in basso a destra. Specializzato in:
- Analisi di opzioni e greche
- Calcolo strategie di copertura (delta hedge, LEAPS put, spread)
- Lookup prezzi e dati di mercato in tempo reale
- Interpretazione dei dati dello scanner

### Sicurezza
- Visibile solo agli utenti autenticati
- Non accessibile su pagine `/login` e `/register`
- Redirect automatico al login se sessione scaduta
