# Coiled Spring Terminal — Manuale Utente
**Versione:** luglio 2026

---

## Benvenuto nel Coiled Spring Terminal

Il terminale è una piattaforma proprietaria per il trading di opzioni basato sulla strategia Coiled Spring. Questa guida ti accompagna nelle funzionalità principali.

---

## 1. Navigazione

La barra di navigazione in alto dà accesso a tutti i moduli:

| Tab | Modulo |
|---|---|
| **SCANNER** | Scanner opzioni — candidati strategia |
| **HV SCREENER** | Screener volatilità storica |
| **PORTFOLIO** | Gestione portafoglio personale |
| **WATCHLIST** | Lista monitoraggio ticker |
| **MARKET** | Dati di mercato e indici |

---

## 2. Cambio tema: Night / Day Mode

Il pulsante tema si trova **in alto a destra** nella barra di navigazione.

- **☀ (sole)** → attiva Day Mode (sfondo chiaro, ideale per ambienti luminosi)
- **🌙 (luna)** → attiva Night Mode (sfondo scuro, ideale per sessioni lunghe)

La preferenza viene salvata automaticamente — al prossimo accesso il tema sarà lo stesso che hai scelto.

> **Nota:** se stai usando la Volatility Surface e cambi tema, la surface si aggiorna automaticamente senza dover ricaricare la pagina.

---

## 3. Scanner Opzioni

### Come leggere la tabella

La tabella mostra i candidati che soddisfano i criteri Coiled Spring. Ecco come interpretare ogni colonna:

**TICKER** — Il simbolo del titolo. Clicca su una riga per aprire il dettaglio con la Volatility Surface e le opzioni disponibili.

**LAST** — Ultimo prezzo del titolo quotato da Yahoo Finance (ritardo ~15 min in modalità free).

**HV30** — Volatilità storica degli ultimi 30 giorni di trading, espressa come valore decimale (es. `0.35` = 35%).

**HV RANK** — Percentile della HV30 rispetto agli ultimi 252 giorni (1 anno). Un rank di `85` significa che la volatilità attuale è più alta dell'85% delle osservazioni dell'ultimo anno.
- **Rank alto (>75):** volatilità storicamente elevata — potenziale setup per vendita di volatilità
- **Rank basso (<25):** volatilità compressa — potenziale setup per acquisto di volatilità (Coiled Spring)

**HV PCT** — Percentile HV sulla storia completa disponibile (multi-anno). Complementare a HV Rank.

**BID / ASK** — Spread del contratto opzione ATM più vicino alla scadenza di 30 giorni. Il `—` indica dato non disponibile (mercato chiuso, ticker senza opzioni liquide, o dato stale).

**IV** — Volatilità implicita ATM. Si confronta con HV30: se IV < HV30 il mercato prezza la vol futura meno di quella storica — segnale potenzialmente favorevole all'acquisto di opzioni.

**CS SCORE** — Vedi sezione dedicata qui sotto.

---

## 4. CS Score — Come si interpreta

Il **Coiled Spring Candidate Score** è il punteggio composito del setup. Va da 0 a 100.

```
█████████████████░░░  85/100
```

| Range | Significato | Azione suggerita |
|---|---|---|
| **80 – 100** | Setup eccellente | Alta priorità — analisi approfondita |
| **60 – 79** | Setup buono | Da monitorare — verifica contesto |
| **40 – 59** | Setup discreto | Solo in contesto favorevole |
| **< 40** | Setup debole | Evitare — non soddisfa i criteri |

Il CS Score sintetizza: spread HV/IV, liquidità delle opzioni, momentum del titolo, e qualità tecnica del setup.

---

## 5. Filtri dello Scanner

Nella sezione filtri in alto puoi restringere i risultati:

- **HV Rank Min/Max** — filtra per range di percentile (es. solo titoli con rank tra 20 e 50 per setup di acquisto vol)
- **CS Score Min** — mostra solo i candidati sopra una soglia (es. >70 per soli setup di alta qualità)
- **Cerca ticker** — cerca un simbolo specifico
- **Solo opzionabili** — esclude titoli senza mercato opzioni liquido
- **Escludi ETF** — filtra gli ETF per concentrarsi su singoli titoli

---

## 6. Volatility Surface

Cliccando su un ticker nello scanner si apre il pannello dettaglio con la **Volatility Surface** — un grafico 3D che mostra come la volatilità implicita varia per strike e scadenza.

### Come leggere la surface

- **Asse X:** Strike price (prezzo di esercizio)
- **Asse Y:** DTE — giorni a scadenza
- **Asse Z:** IV implicita (%)

Un picco sull'asse Z in corrispondenza di strike OTM (out-of-the-money) indica lo **smile di volatilità** — normale nelle opzioni su equity dove i put OTM trattano a premium rispetto al modello log-normale.

Una surface **piatta** su tutti gli strike indica volatilità uniforme — raro e potenzialmente interessante.

### Interazione
- **Trascina** per ruotare la vista 3D
- **Scroll** per zoom
- **Hover** su un punto per vedere i valori esatti (strike, DTE, IV)

---

## 7. IV History — Dati Storici Volatilità Implicita

Il sistema raccoglie ogni giorno (dopo la chiusura del mercato americano, circa le 18:30 ora italiana) la volatilità implicita ATM per oltre 1100 titoli su 4 orizzonti:

| Orizzonte | Cosa misura |
|---|---|
| **30 giorni** | IV breve termine — più sensibile a eventi imminenti |
| **60 giorni** | IV medio termine |
| **90 giorni** | IV trimestrale |
| **180 giorni** | IV semestrale — più stabile, meno rumorosa |

**Quando sono disponibili i dati?** Il sistema ha iniziato a raccogliere dati completi dal **16 luglio 2026**. I dati crescono giorno per giorno — più tempo passa, più ricca sarà la serie storica per l'analisi di mean-reversion sulla volatilità.

**Perché la IV storica è utile?**
- Identificare quando la IV è su minimi storici (potenziale acquisto di volatilità)
- Confrontare IV attuale vs media storica per calibrare il timing di entrata
- Analizzare la struttura a termine della volatilità nel tempo

---

## 8. Portfolio

Il modulo Portfolio ti permette di tracciare le tue posizioni opzioni aperte.

### Aggiungere una posizione
1. Clicca **"+ Aggiungi posizione"**
2. Inserisci: ticker, tipo (call/put), strike, scadenza, quantità, prezzo di carico
3. Conferma — la posizione appare in tabella con P&L in tempo reale

### P&L e greche
Per ogni posizione vedi:
- **P&L unrealizzato** ($ e %) aggiornato con l'ultimo prezzo
- **Delta, Gamma, Vega, Theta** calcolati con Black-Scholes
- **Aggregato portafoglio** in fondo alla pagina

### AI Chat per l'analisi
Il FAB arancio in basso a destra apre la **Coiled AI** — puoi chiedere:
- *"Come mi copro su questa posizione?"*
- *"Qual è il delta totale del portafoglio?"*
- *"Suggerisci uno spread per ridurre il costo di copertura"*

---

## 9. Watchlist

La Watchlist è la tua lista personalizzata di ticker da monitorare.

### Gestione
- **Aggiungi ticker:** clicca "+ Aggiungi" e inserisci il simbolo
- **Rimuovi ticker:** hover sulla riga → icona cestino
- **Ordina:** clicca sull'intestazione di colonna per ordinare

### Alert
Puoi impostare alert di prezzo per ogni ticker — ricevi una notifica quando il prezzo supera o scende sotto una soglia impostata.

---

## 10. HV Screener

Lo HV Screener classifica tutti i titoli dell'universo per volatilità storica.

### Come usarlo

Usa lo screener per trovare i titoli con la volatilità storica più compressa (basso HV Rank) — questi sono i migliori candidati per una strategia long volatilità come il Coiled Spring.

**Flusso di lavoro tipico:**
1. Apri HV Screener → ordina per HV Rank crescente
2. Identifica i titoli con HV Rank < 20% (vol compressa)
3. Vai allo Scanner e filtra su quei ticker
4. Verifica CS Score e struttura opzioni
5. Apri dettaglio → analizza Volatility Surface

---

## 11. Coiled AI

L'assistente AI è accessibile da qualsiasi pagina del terminale tramite il **bottone arancio** in basso a destra.

### Cosa puoi chiedergli

**Analisi opzioni:**
- "Qual è la delta di una call AAPL strike 190 scadenza agosto?"
- "Calcola il prezzo teorico Black-Scholes con IV 35%"

**Strategie di copertura:**
- "Come copro 100 azioni NVDA con opzioni?"
- "Qual è il costo di uno straddle ATM su SPY per agosto?"

**Dati di mercato:**
- "Quanto quota TSLA adesso?"
- "Mostrami i dati del portafoglio"

**Analisi ISIN:**
- Puoi inserire codici ISIN europei — l'AI li riconosce automaticamente (es. "Quanto vale IE00B4L5Y983?")

> **Nota:** L'AI fornisce analisi educative e strumenti di calcolo. Non costituisce consulenza finanziaria. Le decisioni di investimento rimangono di tua esclusiva responsabilità.

---

## 12. Domande frequenti

**Il prezzo che vedo è in tempo reale?**
No — i prezzi da Yahoo Finance hanno un ritardo di circa 15 minuti. Per dati live collegare un broker (IBKR o Tastytrade — funzionalità in sviluppo).

**Perché alcuni dati mostrano "—" invece di un numero?**
Il `—` indica che il dato non è disponibile: mercato chiuso, opzione non liquida, o ticker recentemente delistato. Non significa che il valore sia zero.

**Perché la Volatility Surface cambia colori quando cambio tema?**
È intenzionale — il grafico Plotly usa palette diverse per Night e Day mode per garantire leggibilità ottimale in entrambi i temi.

**I dati IV history sono disponibili per tutti i giorni passati?**
I dati storici completi partono dal 16 luglio 2026. Ogni giorno dopo la chiusura del mercato US viene aggiunto un nuovo punto storico automaticamente.

**Posso usare il terminale su mobile?**
Il terminale è ottimizzato per desktop. Su mobile la navigazione è possibile ma l'esperienza è limitata per la densità di informazioni mostrata.
