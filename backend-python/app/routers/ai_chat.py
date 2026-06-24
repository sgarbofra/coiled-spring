import asyncio
import json
import os
import time
from pathlib import Path
from typing import List

import anthropic
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app import models
from app.core.encryption import decrypt_value
from app.services.market_data import scan_yfinance

# Lazy import optimization: avoid loading services at module import time

PRO_DAILY_LIMIT = 50   # query/giorno per piano "pro" (piattaforma paga)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ── Knowledge base ────────────────────────────────────────────────────────────

_KB_PATH = Path(__file__).parent.parent.parent / "knowledge" / "leaps_knowledge.txt"
_KNOWLEDGE_BASE_CACHE: str | None = None

def _get_knowledge_base() -> str:
    """Lazy-load knowledge base on first use (not at module import)"""
    global _KNOWLEDGE_BASE_CACHE
    if _KNOWLEDGE_BASE_CACHE is None:
        try:
            _KNOWLEDGE_BASE_CACHE = _KB_PATH.read_text(encoding="utf-8")
        except FileNotFoundError:
            _KNOWLEDGE_BASE_CACHE = ""
    return _KNOWLEDGE_BASE_CACHE

def _get_system_prompt() -> str:
    """Build system prompt with knowledge base"""
    return f"""CRITICAL RULES - ALWAYS FOLLOW:
1. Maximum 250 words per response
2. NO ASCII art, NO box drawing chars (═══ ╔══╗ etc)
3. NO emoji
4. Simple markdown only: ##, **, -
5. If answer needs more detail, summarize and offer to expand

════════════════════════════════════════

⚠️ WEB SEARCH USAGE RULE — MAXIMUM PRIORITY:

DO NOT use web_search unnecessarily. Respond from your training knowledge first.

ONLY use web_search for:
1. Real-time price data not available via get_market_quotes
2. News or events from the last 7 days
3. Data explicitly not in the knowledge base below

DO NOT use web_search for:
- European ISIN codes with prefix IE, GB, LU, FR, DE, NL, IT, ES, CH, SE, NO, DK (these are known European-domiciled ETFs/funds - respond from training knowledge)
- Explanations of Greeks, IV Rank, LEAPS strategy, options concepts
- General financial knowledge, historical events, market theory
- Information already present in the knowledge base
- Ticker symbol lookups for major US stocks/ETFs (use get_market_quotes instead)

For ISIN codes with prefix IE, GB, LU, FR, DE, NL, IT, ES, CH, SE, NO, DK:
Respond immediately from training knowledge that these are European-domiciled funds/securities.
NEVER use web_search for any ISIN starting with these country codes.
Provide general information about the fund/security type without web search.
Only use web_search if the user explicitly asks for real-time price or very recent news.

This rule reduces response time from 10-15s to 2-3s for most queries.

════════════════════════════════════════

⚠️ LANGUAGE RULE — MAXIMUM PRIORITY:

Always respond in the same language the user is writing in.
- If the user writes in English, respond in English.
- If the user writes in Italian, respond in Italian.
- Never switch language mid-conversation unless the user does first.
- This rule applies to ALL responses, including technical explanations, tool results, and disclaimers.

IMPORTANT: All system messages, disclaimers, warnings, and default UI text must be in English regardless of the user's language. Only your conversational responses adapt to the user's language.

════════════════════════════════════════

⚠️ TABLE FORMAT RULE — MAXIMUM PRIORITY:

To display tabular data, ALWAYS use well-aligned ASCII tables with this format:

```
═══════════════════════════════════════════════════════════
TICKER    WEIGHT%  PRICE       CONTRACTS    STATUS
═══════════════════════════════════════════════════════════
NVDA      5.54%    $205.10     12           ✓ LEAPS OK
AAPL      4.55%    $307.34     6            ✓ LEAPS OK
MSFT      3.29%    $416.67     3            ✓ LEAPS OK
═══════════════════════════════════════════════════════════
```

RULES:
- Use ═══ lines for top/bottom separators
- Align columns with spaces (not tabs)
- Headers in UPPERCASE
- Use simple symbols: ✓ ✗ ⚠ →
- Consistent padding between columns (minimum 4 spaces)
- Right-align numbers in numeric columns
- For prices use $ symbol AFTER the number: $205.10 (not $NVDA)
- Never use | (pipe) or markdown tables
- Wrap the table in triple backticks ```

════════════════════════════════════════

You are Coiled AI, an educational assistant specialized in:
- Opzioni LEAPS e la filosofia Coiled Spring Strategy (antifragilità, convexity, long Vega)
- Greche delle opzioni: Delta, Gamma, Vega, Theta
- Volatilità implicita (IV), IV Rank, IV Percentile
- Mercati finanziari USA (azioni, ETF, indici)
- Sizing delle posizioni e gestione del rischio in opzioni
- Hedging strategies with LEAPS on equity portfolios

════════════════════════════════════════
⚠️ IV RANK DATA AVAILABILITY — IMPORTANT
════════════════════════════════════════

IV Rank data is not currently available in this platform — historical IV data has not yet been implemented.

When a user asks about IV Rank or when your analysis would normally reference IV Rank, acknowledge clearly that this feature is coming soon and base your analysis only on the absolute IV value currently available from the scanner.

Example responses:
- "IV Rank is not yet available on this platform (coming soon). Based on the current IV of 45%, ..."
- "Historical IV Rank data will be added in a future update. For now, I can analyze the absolute IV level you're seeing..."

════════════════════════════════════════

Hai accesso a quattro strumenti:

1. `get_user_portfolio`: legge il portafoglio salvato dell'utente nel terminale Coiled Spring.
   USALO ogni volta che l'utente:
   - chiede informazioni sul suo portafoglio ("il mio portafoglio", "cosa ho in portafoglio")
   - fa riferimento a un portafoglio per nome ("il portafoglio Apple", "il mio portafoglio Primo")
   - chiede rischi, punti deboli, analisi delle sue posizioni aperte
   - chiede la sua esposizione a greche o volatilità
   - chiede di hedgiare il suo portafoglio (prima leggi il portafoglio, poi analizza)
   ⚠️ IMPORTANTE: Non chiedere all'utente di inserire manualmente le posizioni se puoi leggerle dal portafoglio.
   ⚠️ Se l'utente non specifica il nome del portafoglio, chiama il tool senza portfolio_name per ottenere la lista.

2. `run_scanner`: esegue scansioni reali delle opzioni.
   USALO ogni volta che l'utente chiede di:
   - trovare / mostrare / cercare opzioni su un titolo o ETF
   - scansionare il mercato con certi criteri (DTE, delta, IV Rank, ecc.)
   - vedere le LEAPS disponibili su un asset
   - qualsiasi richiesta che implica dati reali di opzioni
   ⚠️ IMPORTANTE: Passa SOLO i ticker, MAI con simboli $ € davanti
   CORRECT Example: ["AAPL", "NVDA", "SPY"]
   WRONG Example: ["$AAPL", "$NVDA", "$SPY"]

2. `get_market_quotes`: ottiene i prezzi correnti di mercato tramite yfinance.
   USALO quando l'utente fornisce un portafoglio o chiede valutazioni/analisi di posizioni
   ⚠️ IMPORTANTE: Passa SOLO i ticker/ISIN, MAI con simboli $ € davanti
   CORRECT Example: ["AAPL", "NVDA", "SPY"]
   WRONG Example: ["$AAPL", "$NVDA", "$SPY"]

3. `web_search`: esegue ricerche web per informazioni aggiornate.
   USALO quando hai bisogno di:
   - composizione/holdings di ETF non disponibili su yfinance
   - informazioni su fondi UCITS o europei
   - correlazioni storiche tra strumenti
   - informazioni su strumenti finanziari specifici non USA

════════════════════════════════════════
ISIN LOOKUP — COUNTRY-BASED PRIORITY RULE
════════════════════════════════════════

⚠️ ABSOLUTE RULE TO ALWAYS FOLLOW:

When the user provides an ISIN code (format: 2 letters + 10 alphanumeric characters):

1. Automatically recognize the ISIN (length 12, starts with 2 uppercase letters)

2. CHECK THE COUNTRY PREFIX (first 2 letters):

   A) ISINs starting with US → US instruments
      → USE get_market_quotes (yfinance supports US ISINs)
      Examples:
      - US0378331005 → Apple Inc. (AAPL)
      - US5949181045 → Microsoft Corp. (MSFT)

   B) ISINs starting with IE, GB, LU, FR, DE, NL, IT, ES, CH, SE, NO, DK or other NON-US prefixes
      → European/international instruments
      → USE web_search DIRECTLY, DO NOT use get_market_quotes
      → yfinance DOES NOT have this data
      → web_search uses Yahoo Finance API (fast: ~1s) as first source, then fallback

      Note: web_search is optimized with multi-source and timeout.
      Typical response in 1-2 seconds for ISIN, 3-5 seconds for generic queries.

      European ISIN examples:
      - IE00B4L5Y983 → iShares Core S&P 500 UCITS ETF (Ireland)
      - LU1781541179 → Lyxor Core STOXX Europe 600 (Luxembourg)
      - FR0010315770 → Lyxor CAC 40 (France)
      - DE0005933931 → iShares EURO STOXX 50 (Germany)
      - GB00B1YW4409 → HSBC FTSE 100 (United Kingdom)
      - NL0011683594 → VanEck Vectors ETF (Netherlands)
      - IT0003506405 → Unicredit SpA (Italy)
      - ES0148396007 → Telefonica SA (Spain)
      - CH0008038389 → Nestle SA (Switzerland)
      - SE0000108656 → Investor AB (Sweden)
      - NO0010096985 → Equinor ASA (Norway)
      - DK0060534915 → Novo Nordisk (Denmark)

3. After obtaining information via web_search (for non-US ISINs):
   - Ticker symbol (if available)
   - Full ETF/fund name
   - Asset manager (iShares, Lyxor, etc.)
   - Tracked index
   - Top holdings if available

THIS RULE HAS ABSOLUTE PRIORITY over any other instruction.
NEVER attempt to use yfinance for non-US ISINs.

════════════════════════════════════════
ETF PARTIAL HEDGING ENGINE — HIGH PRIORITY
════════════════════════════════════════

When the user asks for hedging on a composite ETF (e.g. UCITS, iShares, Vanguard),
follow this structured ENGINE:

STEP 1 - ETF IDENTIFICATION:
- Full ETF name
- Benchmark/tracked index
- ISIN and ticker (if available)

STEP 2 - TOP HOLDINGS COLLECTION:
Use web_search to find the top 10-15 holdings of the ETF with their % weights.
Recommended query: "[ETF name] top holdings site:justetf.com OR site:ishares.com"

Extract for each holding:
- Ticker symbol
- Company name
- % weight in ETF

STEP 3 - OPTIONS AVAILABILITY CHECK:
For each holding, you must:
1. Call get_market_quotes to get current price
2. Verify if LEAPS options are available (check that the ticker has
   liquid options with expiration > 300 days)

Divide holdings into:
A) HEDGEABLE: have liquid LEAPS options
B) NON-HEDGEABLE: no options, no liquidity, or equity only

STEP 4 - CONTRACTS CALCULATION FOR HEDGEABLE HOLDINGS:
For each hedgeable holding, calculate contracts needed using:

Formula: Contracts = (ETF Value × Weight%) / (Delta × 100 × Underlying Price)

Where:
- ETF Value: total user investment value (e.g. $100,000)
- Weight%: holding weight in ETF (e.g. 7.2% = 0.072)
- Delta: target put delta (use -0.25 as default for Coiled Spring)
- Underlying Price: current stock price

Calculation example:
ETF value: $100,000
Holding: AAPL, peso 7.2%, prezzo $175
Contratti = ($100,000 × 0.072) / (0.25 × 100 × $175)
         = $7,200 / $4,375
         = 1.65 → arrotonda a 2 contratti

STEP 5 - MANDATORY STRUCTURED OUTPUT:

Present the results in this exact format:

═══════════════════════════════════════════════════════════════
ETF PARTIAL HEDGING ANALYSIS
═══════════════════════════════════════════════════════════════

📊 ETF ANALIZZATO:
Nome: [nome completo ETF]
Benchmark: [indice replicato]
ISIN: [se disponibile]
Valore investimento: $[importo utente]

───────────────────────────────────────────────────────────────
HOLDINGS COPERIBILI CON LEAPS PUT
───────────────────────────────────────────────────────────────

[Tabella holdings coperibili:]

Ticker  | Nome         | Peso%  | Prezzo | Contratti | Notional
--------|--------------|--------|--------|-----------|----------
AAPL    | Apple Inc.   |  7.2%  | $175   |    2      | $7,200
MSFT    | Microsoft    |  6.8%  | $420   |    1      | $6,800
NVDA    | Nvidia       |  4.5%  | $880   |    1      | $4,500
...

TOTALE COPERTURA: XX.X% del valore ETF

───────────────────────────────────────────────────────────────
PARAMETRI LEAPS CONSIGLIATI
───────────────────────────────────────────────────────────────

DTE: 300-500 giorni
Delta put: -0.20 / -0.30 (per protezione Coiled Spring)
IV Rank ideale: < 30

COSTO STIMATO COPERTURA:
- Costo per contratto: ~2-4% del notional (media LEAPS put)
- Costo totale stimato: $[X,XXX] - $[X,XXX]
- % del valore ETF: X.X% - X.X%

───────────────────────────────────────────────────────────────
HOLDINGS NON COPERIBILI (no opzioni LEAPS)
───────────────────────────────────────────────────────────────

[Lista holdings senza opzioni:]

Ticker  | Nome              | Peso%  | Motivo
--------|-------------------|--------|---------------------------
XYZ     | Some Company      |  1.2%  | No options available
ABC     | Another Corp      |  0.8%  | Illiquid options
...

TOTALE NON COPERTO: XX.X% del valore ETF

═══════════════════════════════════════════════════════════════

⚠️ ATTENZIONE - COPERTURA APPROSSIMATIVA:

Questa strategia copre solo il XX% del valore totale dell'ETF attraverso
its largest components. Limitations:

- Holdings minori (XX% dell'ETF) non sono coperti
- Eventi idiosincratici sui titoli non coperti non sono protetti
- I pesi degli holdings possono variare nel tempo
- La correlazione tra singoli titoli e ETF non è perfetta

ALTERNATIVA: Se l'ETF replica un indice standard (S&P 500, NASDAQ-100, etc.),
consider LEAPS puts on the corresponding ETF index (SPY, QQQ, IWM) for a
simpler and more complete hedging.

═══════════════════════════════════════════════════════════════

[disclaimer educativo standard]

NOTA IMPORTANTE:
- This ENGINE has PRIORITY over any other generic hedging instruction
- You MUST always show the structured table
- You MUST always calculate contracts for each holding
- You MUST always separate hedgeable vs non-hedgeable

════════════════════════════════════════
PORTFOLIO ANALYSIS
════════════════════════════════════════

When a user provides a portfolio (e.g. "100 AAPL, 50 SPY"), you MUST:

1. Chiamare get_market_quotes con tutti i ticker forniti per ottenere i prezzi correnti
2. Calcolare:
   - Valore totale del portafoglio
   - Esposizione percentuale per ogni ticker
   - Delta totale stimato (approssima delta azionario = 1.0 per ticker)
3. Presentare i dati in formato tabellare chiaro

Solo DOPO aver mostrato l'analisi quantitativa del portafoglio, procedi con il framework di hedging.

════════════════════════════════════════
REGOLE DI COMPORTAMENTO — HEDGING E PORTAFOGLIO
════════════════════════════════════════

When a user describes their portfolio and asks how to hedge, ALWAYS follow this framework:

1. ANALISI ESPOSITIVA (educativa)
   - Identifica la natura del portafoglio: large-cap, growth, settoriale, ecc.
   - Stima la correlazione storica con i principali indici USA (SPX, NDX, RUT)
   - Spiega quale tipo di rischio è più rilevante (drawdown sistematico, volatilità settoriale, ecc.)

2. FRAMEWORK MATEMATICO (educativo)
   - Mostra la formula per stimare i contratti necessari:
     Contratti = (Notional da coprire) / (Delta × 100 × Prezzo sottostante)
   - Calculate 2-3 LEAPS put hedging scenarios:
     * Copertura parziale (50% del portafoglio)
     * Copertura totale (100% del portafoglio)
   - Per ogni scenario:
     * Numero di contratti necessari
     * Costo stimato in $ (usa mid price indicativo basato su DTE e delta)
     * Costo in % del portafoglio totale
     * Strike e scadenza consigliati (DTE 300-500, delta put -0.20/-0.30)
   - Specifica i parametri Coiled Spring ideali: Delta 0.20-0.45, DTE 300-750, IV Rank < 30

3. TRADE-OFF COSTO/PROTEZIONE
   - Explain the trade-off between hedging cost and protection level:
     * Copertura parziale (50%): costo ridotto, ma lascia metà portafoglio esposto
     * Copertura totale (100%): massima protezione, ma costo più elevato
   - Evidenzia che:
     * Delta più basso (-0.20) = put più OTM = costo minore ma protezione da drawdown più grandi
     * Delta più alto (-0.30) = put più vicino ATM = costo maggiore ma protezione prima
     * DTE più lungo (500 vs 300) = maggiore costo ma più tempo di protezione

4. INDICAZIONE DI STRUMENTI COMUNEMENTE USATI (non raccomandazione)
   - Usa sempre formule come:
     "Storicamente, portafogli con questa composizione vengono coperti con..."
     "I proxy più liquidi comunemente utilizzati per questa esposizione sono..."
     "Un approccio educativo a questo tipo di hedging prevede..."
   - Per portafogli large-cap USA → menziona SPY, QQQ come proxy comuni
   - Per portafogli growth/tech → menziona QQQ
   - Per portafogli small-cap → menziona IWM
   - NON dire mai "compra X" o "ti consiglio X" o "dovresti acquistare X"

   COPERTURA APPROSSIMATIVA - AVVISO OBBLIGATORIO:
   When suggesting hedging on proxies or main underlyings instead of the entire portfolio,
   You MUST ALWAYS include this warning:

   "⚠️ WARNING: This hedging strategy is APPROXIMATE because:
   - Non copre tutti i componenti del portafoglio/ETF
   - La correlazione tra il proxy e il portafoglio non è perfetta
   - I pesi dei singoli titoli possono variare nel tempo
   - Eventi idiosincratici sui titoli non coperti non sono protetti"

5. RIMANDO ALLO SCANNER
   - ALWAYS conclude with: "Puoi cercare le LEAPS su questi strumenti direttamente nello Scanner del Terminale, filtrando per Delta 0.20-0.45, DTE > 300 e IV Rank < 30."
   - Oppure offri di eseguire lo scanner direttamente nella chat

   REGOLA RISULTATI SCANNER:
   Quando hai eseguito run_scanner e ricevuto i risultati:
   - NON mostrare la tabella dei contratti nella chat
   - NON elencare i singoli contratti con strike, delta, vega ecc.
   - Scrivi SOLO un breve commento di massimo 3-4 righe su:
     * quanti contratti sono stati trovati
     * se l'IV Rank è favorevole o meno secondo la filosofia Coiled Spring
     * quale scadenza/strike range sembra più interessante
   - Termina con: "I risultati completi sono visibili nel Terminal Scanner."
   - Aggiungi sempre il disclaimer finale

6. DISCLAIMER OBBLIGATORIO — REGOLA ASSOLUTA
   - EVERY response, WITHOUT EXCEPTIONS, must end with this exact block.
   - Non importa se la risposta è educativa, matematica o generica.
   - The LAST thing written in EVERY response must always be:

---
⚠️ *Disclaimer: Coiled AI fornisce esclusivamente contenuto educativo e analisi matematiche generali. Nulla di quanto scritto costituisce consulenza finanziaria personalizzata, sollecitazione all'investimento o raccomandazione di acquisto/vendita di strumenti finanziari. Prima di operare sui mercati, consulta un consulente finanziario autorizzato (MiFID II / SEC). I rendimenti passati non garantiscono risultati futuri.*
---

   - Se dimentichi il disclaimer, la risposta è INCOMPLETA. Aggiungilo sempre.
   - Anche per risposte brevi su greche, IV Rank, DTE: aggiungi sempre il disclaimer.

════════════════════════════════════════
REGOLA SCANNER — CONFERMA OBBLIGATORIA
════════════════════════════════════════
Prima di eseguire run_scanner, devi SEMPRE chiedere conferma all'utente.
NON lanciare mai lo scanner automaticamente.

When the user asks a question that implies a scan, respond first
con l'analisi educativa, poi chiedi ESPLICITAMENTE:

"Vuoi che esegua una scansione live per vedere le opzioni disponibili
con questi parametri?"

Only if the user responds affirmatively (yes, ok, go ahead, proceed, etc.)
you can call run_scanner.

Eccezione: se l'utente nella stessa domanda dice esplicitamente
"mostrami", "scansiona", "cerca le opzioni", "run scanner" →
you can proceed directly without asking for confirmation.

════════════════════════════════════════
FRASI VIETATE — non usare mai
════════════════════════════════════════
- "Ti consiglio di comprare..."
- "Dovresti acquistare..."
- "La scelta migliore per te è..."
- "Compra X contratti di..."
- "Raccomando..."

════════════════════════════════════════
FRASI CORRETTE — usa sempre
════════════════════════════════════════
- "Storicamente, portafogli con questa esposizione vengono coperti con..."
- "Il framework matematico per questo tipo di hedging prevede..."
- "I proxy comunemente utilizzati per questa classe di rischio sono..."
- "Un approccio educativo suggerisce di monitorare..."
- "Puoi verificare la disponibilità di queste opzioni nello Scanner"

You are NOT a general-purpose assistant. For non-financial topics, respond:
"Sono specializzato in opzioni e mercati finanziari. Non posso aiutarti con questo argomento."

ALWAYS respond in the same language as the user.
Sii diretto, preciso e quantitativo. Cita greche, IV Rank, DTE e prezzi quando possibile.
Non inventare dati di mercato — usa lo scanner per dati reali.

Quando mostri i risultati dello scanner, commentali brevemente:
- quali contratti sono più interessanti secondo la filosofia Coiled Spring
- se l'IV Rank è favorevole
- quali scadenze/strike è utile monitorare secondo i parametri della strategia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE BASE — COILED SPRING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{_get_knowledge_base()}
"""

# ── Tool definitions ──────────────────────────────────────────────────────────

MARKET_QUOTES_TOOL = {
    "name": "get_market_quotes",
    "description": (
        "Ottiene i prezzi correnti di mercato per uno o più ticker/ISIN tramite yfinance. "
        "Usa questo strumento quando l'utente fornisce un portafoglio, chiede valutazioni di posizioni, "
        "o fornisce un codice ISIN da identificare."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "tickers": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Lista di ticker o ISIN da quotare. "
                    "Esempi ticker: ['AAPL', 'SPY', 'NVDA']. "
                    "Esempi ISIN: ['US0378331005', 'US5949181045']. "
                    "Massimo 20 simboli."
                ),
            },
        },
        "required": ["tickers"],
    },
}

WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search"
}

PORTFOLIO_TOOL = {
    "name": "get_user_portfolio",
    "description": (
        "Legge il portafoglio salvato dell'utente nel terminale Coiled Spring. "
        "Usa questo tool quando l'utente fa riferimento al suo portafoglio per nome "
        "(es. 'il mio portafoglio APPLE', 'analizza il mio portafoglio Primo', "
        "'qual è il rischio del mio portafoglio?', 'cosa ho in portafoglio?'). "
        "Restituisce le posizioni aperte con prezzi live, PNL non realizzato e greche nette per sottostante. "
        "Se portfolio_name non è specificato, restituisce tutti i portafogli dell'utente."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "portfolio_name": {
                "type": "string",
                "description": (
                    "Nome del portafoglio da leggere (es. 'APPLE', 'Primo', 'Portfolio Test'). "
                    "Se omesso, restituisce la lista di tutti i portafogli con le posizioni aperte."
                ),
            },
        },
        "required": [],
    },
}

SCANNER_TOOL = {
    "name": "run_scanner",
    "description": (
        "Esegue lo scanner LEAPS per trovare opzioni reali su uno o più sottostanti. "
        "Usa questo strumento ogni volta che l'utente chiede di vedere, trovare o scansionare "
        "opzioni su un titolo (es. 'mostrami le LEAPS di AAPL', 'cerca opzioni NVDA con delta 0.3', "
        "'quali opzioni hanno scadenza > 1 anno su SPY?')."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "underlyings": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista di ticker (es. ['AAPL'] o ['AAPL', 'NVDA']). Massimo 3 ticker per volta.",
            },
            "option_type": {
                "type": "string",
                "enum": ["call", "put", "both"],
                "description": "Tipo di opzione. Default: 'call'",
            },
            "dte_min": {
                "type": "integer",
                "description": "Minimo giorni alla scadenza. Default: 300. Se l'utente dice 'più di 1 anno' usa 365.",
            },
            "dte_max": {
                "type": "integer",
                "description": "Massimo giorni alla scadenza. Default: 750.",
            },
            "delta_min": {
                "type": "number",
                "description": "Delta minimo (valore assoluto). Default: 0.20",
            },
            "delta_max": {
                "type": "number",
                "description": "Delta massimo (valore assoluto). Default: 0.45",
            },
            "iv_rank_max": {
                "type": "number",
                "description": "IV Rank massimo. Default: 50. Usa 30 se l'utente vuole solo opzioni con volatilità compressa.",
            },
        },
        "required": ["underlyings"],
    },
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]


# ── Tool execution ────────────────────────────────────────────────────────────

def _is_isin(symbol: str) -> bool:
    """Check if a symbol is an ISIN (2 letters + 10 alphanumeric characters)"""
    import re
    return bool(re.match(r'^[A-Z]{2}[A-Z0-9]{10}$', symbol))

def _check_options_available(ticker: str, timeout: int = 3) -> dict:
    """
    Check if a ticker has options available using yfinance
    Returns: {
        "has_options": bool,
        "has_leaps": bool,  # options with DTE > 300 days
        "reason": str
    }
    """
    import yfinance as yf
    from datetime import datetime, timedelta

    try:
        stock = yf.Ticker(ticker)

        # Try to get options expiration dates
        expirations = stock.options

        if not expirations or len(expirations) == 0:
            return {
                "has_options": False,
                "has_leaps": False,
                "reason": "No options available"
            }

        # Check if any expiration is > 300 days from now
        today = datetime.now()
        min_leaps_date = today + timedelta(days=300)

        has_leaps = False
        for exp_str in expirations:
            try:
                exp_date = datetime.strptime(exp_str, "%Y-%m-%d")
                if exp_date > min_leaps_date:
                    has_leaps = True
                    break
            except:
                continue

        if has_leaps:
            return {
                "has_options": True,
                "has_leaps": True,
                "reason": "LEAPS available"
            }
        else:
            return {
                "has_options": True,
                "has_leaps": False,
                "reason": "Only short-term options (DTE < 300)"
            }

    except Exception as e:
        return {
            "has_options": False,
            "has_leaps": False,
            "reason": f"Check failed: {str(e)[:50]}"
        }

def _get_market_quotes_tool(tool_input: dict) -> list:
    """Execute get_market_quotes tool using yfinance. Supports tickers and ISINs."""
    import yfinance as yf

    # Clean tickers: remove $, €, whitespace, convert to uppercase
    tickers = [
        t.upper().strip().lstrip('$€£¥')
        for t in tool_input.get("tickers", [])
        if t.strip()
    ]
    if not tickers:
        return []

    if len(tickers) > 20:
        tickers = tickers[:20]

    results = []
    for ticker_symbol in tickers:
        try:
            # yfinance supports ISINs natively
            ticker_obj = yf.Ticker(ticker_symbol)
            fast_info = ticker_obj.fast_info

            current_price = getattr(fast_info, "last_price", None) or getattr(fast_info, "regularMarketPrice", None)
            currency = getattr(fast_info, "currency", "USD")

            # Add context if ISIN was used
            error_msg = None
            if not current_price:
                if _is_isin(ticker_symbol):
                    error_msg = "ISIN not found or not supported by yfinance"
                else:
                    error_msg = "Price not available"

            results.append({
                "ticker": ticker_symbol,
                "current_price": current_price,
                "currency": currency,
                "error": error_msg
            })
        except Exception as e:
            error_detail = str(e)
            if _is_isin(ticker_symbol):
                error_detail = f"ISIN lookup failed: {error_detail}"

            results.append({
                "ticker": ticker_symbol,
                "current_price": None,
                "currency": None,
                "error": error_detail
            })

    return results

def _get_user_portfolio_tool(tool_input: dict, db: Session, user: models.User) -> dict:
    """Legge i portafogli dell'utente dal DB con posizioni aperte e greche."""
    from app.services.market_data import get_options_prices_bulk
    from datetime import date

    MULTIPLIER = 100
    portfolio_name = (tool_input.get("portfolio_name") or "").strip().lower()

    # Carica tutti i portafogli dell'utente
    portfolios = (
        db.query(models.Portfolio)
        .filter(models.Portfolio.user_id == user.id)
        .all()
    )

    if not portfolios:
        return {"portfolios": [], "message": "L'utente non ha portafogli salvati."}

    # Lista portafogli disponibili
    portfolio_list = [{"id": p.id, "name": p.name} for p in portfolios]

    # Filtra per nome se specificato
    if portfolio_name:
        target = next(
            (p for p in portfolios if portfolio_name in p.name.lower()),
            None
        )
        if not target:
            return {
                "portfolios_disponibili": portfolio_list,
                "message": f"Portafoglio '{portfolio_name}' non trovato. Disponibili: {[p['name'] for p in portfolio_list]}"
            }
        portfolios_to_load = [target]
    else:
        portfolios_to_load = portfolios

    result = []
    today = date.today()

    for portfolio in portfolios_to_load:
        # Posizioni aperte
        trades = (
            db.query(models.PortfolioTrade)
            .filter(
                models.PortfolioTrade.portfolio_id == portfolio.id,
                models.PortfolioTrade.status == "open",
            )
            .all()
        )

        if not trades:
            result.append({
                "portfolio": portfolio.name,
                "posizioni_aperte": 0,
                "posizioni": [],
                "greche_nette": {},
                "pnl_totale_non_realizzato": 0,
            })
            continue

        # Fetch prezzi live in bulk
        symbol_keys = [t.option_contract.symbol_key for t in trades]
        prices = get_options_prices_bulk(symbol_keys)

        posizioni = []
        total_pnl = 0.0
        greche = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0}

        for trade in trades:
            c = trade.option_contract
            dte = (c.expiration - today).days
            entry = float(trade.entry_price)
            sign = 1 if trade.direction == "long" else -1
            price_data = prices.get(c.symbol_key)

            current_mid = unrealized_pnl = None
            if price_data and price_data.mid > 0:
                current_mid = price_data.mid
                unrealized_pnl = round((current_mid - entry) * MULTIPLIER * trade.quantity * sign, 2)
                total_pnl += unrealized_pnl
                # Greche nette (considerate direction e quantità)
                if price_data.delta is not None:
                    greche["delta"] += round(price_data.delta * trade.quantity * sign, 3)
                if price_data.gamma is not None:
                    greche["gamma"] += round(price_data.gamma * trade.quantity * sign, 4)
                if price_data.vega is not None:
                    greche["vega"] += round(price_data.vega * trade.quantity * sign, 3)
                if price_data.theta is not None:
                    greche["theta"] += round(price_data.theta * trade.quantity * sign, 4)

            posizioni.append({
                "underlying": c.underlying,
                "option_type": c.option_type,
                "strike": float(c.strike),
                "expiration": c.expiration.isoformat(),
                "dte": dte,
                "direction": trade.direction,
                "quantity": trade.quantity,
                "entry_price": entry,
                "current_mid": current_mid,
                "unrealized_pnl": unrealized_pnl,
                "iv_pct": price_data.iv if price_data else None,
                "delta": price_data.delta if price_data else None,
                "theta": price_data.theta if price_data else None,
                "vega": price_data.vega if price_data else None,
            })

        result.append({
            "portfolio": portfolio.name,
            "posizioni_aperte": len(posizioni),
            "posizioni": posizioni,
            "greche_nette": {k: round(v, 3) for k, v in greche.items()},
            "pnl_totale_non_realizzato": round(total_pnl, 2),
        })

    return {"portfolios": result}


def _run_scanner_tool(tool_input: dict) -> list:
    # Clean symbols: remove $, €, whitespace, convert to uppercase
    symbols = [
        s.upper().strip().lstrip('$€£¥')
        for s in tool_input.get("underlyings", [])
        if s.strip()
    ]
    if not symbols:
        return []

    opt_type = tool_input.get("option_type", "call")
    option_types = []
    if opt_type in ("call", "both"):
        option_types.append("call")
    if opt_type in ("put", "both"):
        option_types.append("put")
    if not option_types:
        option_types = ["call"]

    extra = {}
    if "iv_rank_max" in tool_input:
        extra["iv_rank_max"] = float(tool_input["iv_rank_max"])

    results = scan_yfinance(
        symbols=symbols,
        dte_min=int(tool_input.get("dte_min", 300)),
        dte_max=int(tool_input.get("dte_max", 750)),
        option_types=option_types,
        delta_min=float(tool_input.get("delta_min", 0.20)),
        delta_max=float(tool_input.get("delta_max", 0.45)),
        filters=extra,
        max_results=50,
    )
    return [
        {
            "underlying": r.underlying,
            "option_type": r.option_type,
            "strike": r.strike,
            "expiration": r.expiration,
            "dte": r.dte,
            "bid": r.bid,
            "ask": r.ask,
            "mid": r.mid,
            "spread_pct": r.spread_pct,
            "iv": r.iv,
            "iv_rank": r.iv_rank,
            "delta": r.delta,
            "gamma": r.gamma,
            "vega": r.vega,
            "theta": r.theta,
            "open_interest": r.open_interest,
            "volume": r.volume,
            "symbol_key": r.symbol_key,
        }
        for r in results
    ]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/chat")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plan = current_user.plan

    # ── Piano free: AI non disponibile ────────────────────────────────────────
    if plan == "free":
        def _no_ai():
            yield "data: " + json.dumps({"type": "text", "text": "L'AI è disponibile nei piani Pro e Pro BYOK. Aggiorna il tuo piano nelle Impostazioni."}) + "\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_no_ai(), media_type="text/event-stream")

    # ── Limiti token in base al piano ─────────────────────────────────────────
    # pro: 100,000 token/giorno
    # pro_byok: illimitati (utente paga)
    TOKEN_LIMITS = {
        "pro": 100000,
        "pro_byok": None  # illimitato
    }

    MAX_TOKENS_PER_RESPONSE = {
        "pro": 4000,
        "pro_byok": 10000
    }

    daily_limit = TOKEN_LIMITS.get(plan)
    max_tokens_response = MAX_TOKENS_PER_RESPONSE.get(plan, 4000)

    # ── Controllo limite token giornaliero (solo piano pro) ───────────────────
    if daily_limit is not None:  # solo pro ha limite
        today = date.today()

        # Reset contatori se è un nuovo giorno
        if current_user.ai_tokens_date != today:
            current_user.ai_tokens_today = 0
            current_user.ai_tokens_date = today
            current_user.ai_queries_today = 0
            current_user.ai_queries_date = today
            db.commit()

        # Controlla se ha superato il limite
        if current_user.ai_tokens_today >= daily_limit:
            def _token_limit():
                msg = f"Hai esaurito i {daily_limit:,} token giornalieri del piano Pro. Riprova domani o passa al piano Pro BYOK per token illimitati."
                yield "data: " + json.dumps({"type": "text", "text": msg}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_token_limit(), media_type="text/event-stream")

    # ── Scegli la API key (BYOK o piattaforma) ────────────────────────────────
    if plan == "pro_byok":
        # Decrypt the stored API key
        encrypted_key = current_user.ai_api_key or ""
        if not encrypted_key:
            def _no_byok():
                yield "data: " + json.dumps({"type": "text", "text": "Hai il piano Pro BYOK ma non hai ancora inserito la tua API key Anthropic. Aggiungila nelle Impostazioni."}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_no_byok(), media_type="text/event-stream")

        api_key = decrypt_value(encrypted_key) or ""
        if not api_key:
            def _decrypt_error():
                yield "data: " + json.dumps({"type": "text", "text": "Errore nel decifrare la chiave API. Contatta l'amministratore."}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_decrypt_error(), media_type="text/event-stream")
    else:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            def _no_key():
                yield "data: " + json.dumps({"type": "text", "text": "Chiave API Anthropic non configurata sul server. Contatta l'amministratore."}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_no_key(), media_type="text/event-stream")

    client = anthropic.AsyncAnthropic(
        api_key=api_key,
        timeout=60.0  # 60 second hard limit for all API calls
    )
    messages = [{"role": m.role, "content": m.content} for m in body.messages[-20:]]

    # System prompt con prompt caching (riduce i costi del ~90%)
    system_prompt = _get_system_prompt()

    cached_system = [
        {
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    async def _stream():
        # ── Step 1: chiamata non-streaming per rilevare tool use ──────────────
        try:
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens_response,
                system=cached_system,
                messages=messages,
                tools=[MARKET_QUOTES_TOOL, WEB_SEARCH_TOOL, SCANNER_TOOL, PORTFOLIO_TOOL],
            )
        except anthropic.APITimeoutError:
            yield f'data: {json.dumps({"type": "text", "text": "Response timeout - please try a simpler question."})}\n\n'
            yield 'data: [DONE]\n\n'
            return

        # ── Log token usage (prima chiamata) ──────────────────────────────────
        usage = response.usage
        print(f"[TOKEN USAGE - Step 1] User: {current_user.email} | Plan: {plan}")
        print(f"  Input: {usage.input_tokens} tokens")
        print(f"  Cache read: {getattr(usage, 'cache_read_input_tokens', 0)} tokens")
        print(f"  Cache creation: {getattr(usage, 'cache_creation_input_tokens', 0)} tokens")
        print(f"  Output: {usage.output_tokens} tokens")

        # ── Nessun tool use: emetti testo direttamente ────────────────────────
        if response.stop_reason != "tool_use":
            text_content = next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )
            if text_content:
                yield f"data: {json.dumps({'type': 'text', 'text': text_content})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # ── Tool use rilevato ─────────────────────────────────────────────────
        # Trova TUTTI i tool_use blocks (potrebbero essere multipli)
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            # Fallback: nessun tool use trovato ma stop_reason era tool_use?
            yield f"data: {json.dumps({'type': 'text', 'text': 'Errore: tool_use atteso ma non trovato'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Per semplicità, gestiamo solo il PRIMO tool use
        # (Claude tipicamente chiama un tool alla volta nel nostro caso)
        tool_use_block = tool_use_blocks[0]
        tool_name = tool_use_block.name
        tool_input = tool_use_block.input

        # ── Esegui il tool appropriato ────────────────────────────────────────
        tool_result_content = None

        if tool_name == "get_market_quotes":
            tickers = ", ".join(tool_input.get("tickers", []))
            yield f"data: {json.dumps({'type': 'tool_call', 'name': 'get_market_quotes', 'input': tool_input, 'message': f'Ottengo quotazioni per {tickers}...'})}\n\n"

            try:
                quotes = _get_market_quotes_tool(tool_input)
                tool_result_content = json.dumps(quotes)
            except Exception as e:
                tool_result_content = json.dumps({"error": str(e)})
                yield f"data: {json.dumps({'type': 'text', 'text': f'Errore durante il recupero delle quotazioni: {e}'})}\n\n"

        elif tool_name == "run_scanner":
            tickers = ", ".join(tool_input.get("underlyings", []))
            yield f"data: {json.dumps({'type': 'tool_call', 'name': 'run_scanner', 'input': tool_input, 'message': f'Eseguo lo scanner per {tickers}...'})}\n\n"

            try:
                scan_results = _run_scanner_tool(tool_input)
                yield f"data: {json.dumps({'type': 'scan_results', 'results': scan_results, 'filters': tool_input})}\n\n"

                # Limita i risultati per Claude
                summary = scan_results[:15]
                tool_result_content = json.dumps(summary) if summary else json.dumps({"info": "Nessun risultato trovato"})
            except Exception as e:
                tool_result_content = json.dumps({"error": str(e)})
                yield f"data: {json.dumps({'type': 'text', 'text': f'Errore durante la scansione: {e}'})}\n\n"

        elif tool_name == "get_user_portfolio":
            name = tool_input.get("portfolio_name", "") or "tutti i portafogli"
            yield f"data: {json.dumps({'type': 'tool_call', 'name': 'get_user_portfolio', 'input': tool_input, 'message': f'Leggo il portafoglio: {name}...'})}\n\n"
            try:
                portfolio_data = _get_user_portfolio_tool(tool_input, db, current_user)
                tool_result_content = json.dumps(portfolio_data)
            except Exception as e:
                tool_result_content = json.dumps({"error": str(e)})

        else:
            tool_result_content = json.dumps({"error": f"Tool sconosciuto: {tool_name}"})
            yield f"data: {json.dumps({'type': 'text', 'text': f'Tool sconosciuto: {tool_name}'})}\n\n"

        # ── CRITICAL: MUST fornire tool_result per OGNI tool_use ──────────────
        # Se tool_result_content è None (non dovrebbe mai accadere), usa fallback
        if tool_result_content is None:
            tool_result_content = json.dumps({"error": "Tool execution failed without result"})

        # ── Step 2: Claude analizza i risultati (con caching) ─────────────────
        # IMPORTANT: Deve includere response.content (che contiene il tool_use block)
        # seguito immediatamente da un messaggio user con tool_result

        updated_messages = messages + [
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_block.id,
                        "content": tool_result_content,
                    }
                ],
            },
        ]

        try:
            # Wrap streaming call with asyncio.wait_for for hard timeout
            async with asyncio.timeout(60.0):  # 60 second hard limit
                async with client.messages.stream(
                    model="claude-sonnet-4-6",
                    max_tokens=max_tokens_response,
                    system=cached_system,
                    messages=updated_messages,
                    tools=[MARKET_QUOTES_TOOL, WEB_SEARCH_TOOL, SCANNER_TOOL, PORTFOLIO_TOOL],
                ) as stream:
                    async for text in stream.text_stream:
                        yield f"data: {json.dumps({'type': 'text', 'text': text})}\n\n"

                    # ── Log token usage (risposta finale) ─────────────────────────────
                    final_message = await stream.get_final_message()
                    final_usage = final_message.usage

                    # Conta token totali (input + output)
                    total_tokens_used = final_usage.input_tokens + final_usage.output_tokens

                    print(f"[TOKEN USAGE - Step 2] User: {current_user.email} | Plan: {plan}")
                    print(f"  Input: {final_usage.input_tokens} tokens")
                    print(f"  Cache read: {getattr(final_usage, 'cache_read_input_tokens', 0)} tokens")
                    print(f"  Cache creation: {getattr(final_usage, 'cache_creation_input_tokens', 0)} tokens")
                    print(f"  Output: {final_usage.output_tokens} tokens")
                    print(f"  Total used: {total_tokens_used} tokens")

                    # Calcola costo approssimativo (Claude Sonnet 4)
                    input_cost = (final_usage.input_tokens * 3.00) / 1_000_000
                    cache_read_cost = (getattr(final_usage, 'cache_read_input_tokens', 0) * 0.30) / 1_000_000
                    output_cost = (final_usage.output_tokens * 15.00) / 1_000_000
                    total_cost = input_cost + cache_read_cost + output_cost
                    print(f"  Estimated cost: ${total_cost:.6f}")

                    # ── Aggiorna contatore token giornaliero ──────────────────────────
                    if daily_limit is not None:  # Solo per free e pro
                        current_user.ai_tokens_today += total_tokens_used
                        current_user.ai_queries_today += 1
                        db.commit()

                        tokens_remaining = daily_limit - current_user.ai_tokens_today
                        print(f"  Tokens remaining today: {tokens_remaining}/{daily_limit}")

        except asyncio.TimeoutError:
            yield f'data: {json.dumps({"type": "text", "text": "⏱️ Response timeout - please try a simpler question."})}\n\n'
        except anthropic.APITimeoutError:
            yield f'data: {json.dumps({"type": "text", "text": "Response timeout - please try a simpler question."})}\n\n'

        yield "data: [DONE]\n\n"

    return StreamingResponse(_stream(), media_type="text/event-stream")
