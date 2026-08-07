# Piano Editoriale — Strategie con le Opzioni: Video Pratici 5 min
**Coiled Spring Academy — Livello: Intermedio / Paper Trading**
Luglio 2026

**Target:** chi conosce già call, put, greche, moneyness e vuole iniziare a fare paper trading.
**Formato:** max 5 minuti per video. Struttura fissa ogni episodio: Setup → Outlook → Parametri → Entry/Exit → Demo rapida.
**Niente teoria, niente introduzioni, niente disclaimer lunghi.** Si apre il video e si costruisce il trade.

---

## SERIE 1 — STRATEGIE DIREZIONALI
*Guadagni se il mercato si muove nella direzione giusta.*

---

### S1.01 — Long Call
**Setup:** BUY 1 call OTM, delta 0.30–0.40, DTE 45–60 giorni
**Outlook:** rialzista con catalizzatore identificato
**Parametri paper trading:**
- Strike: +5% dall'ATM circa
- DTE entrata: 45–60 giorni
- Budget massimo: 2–3% del portafoglio per trade
- Exit profitto: chiudi al +50% del valore dell'opzione
- Stop loss: chiudi al −50% del valore dell'opzione (non aspettare a zero)
**Demo:** scanner Coiled Spring → filtro delta 0.30, DTE 45–60, CS Score > 60

---

### S1.02 — Long Put
**Setup:** BUY 1 put OTM, delta −0.30/−0.40, DTE 45–60 giorni
**Outlook:** ribassista con catalizzatore identificato (o hedging su posizione long esistente)
**Parametri paper trading:**
- Strike: −5% dall'ATM circa
- Exit profitto: +50% del valore
- Stop loss: −50% del valore
- Alternativa hedging: put ITM delta −0.60, DTE 90 giorni per copertura meno sensibile al theta
**Nota pratica:** la long put perde valore velocemente se il titolo non scende. Non tenerla per più di 2–3 settimane senza movimento.

---

### S1.03 — Bull Call Spread
**Setup:** BUY call strike A + SELL call strike B (B > A), stesso DTE
**Outlook:** rialzista moderato — il titolo arriva a B ma non necessariamente lo supera
**Parametri paper trading:**
- Strike A: ATM o leggermente OTM (delta 0.40–0.50)
- Strike B: +5/+7% sopra il prezzo attuale
- DTE: 30–45 giorni
- Debito massimo: 30–40% della differenza tra strike (es. spread $5 → paga max $1.50–$2.00)
- Exit profitto: chiudi al +50% del profitto massimo
- Stop loss: chiudi se il debito pagato raddoppia

---

### S1.04 — Bear Put Spread
**Setup:** BUY put strike A + SELL put strike B (A > B), stesso DTE
**Outlook:** ribassista moderato — il titolo scende verso B
**Parametri paper trading:** speculari al Bull Call Spread
- Strike A: ATM o leggermente OTM (delta −0.40/−0.50)
- Strike B: −5/−7% sotto il prezzo attuale
- DTE: 30–45 giorni
- Exit: +50% del profitto massimo

---

## SERIE 2 — STRATEGIE INCOME (VENDITA PREMI)
*Guadagni se il mercato rimane fermo o si muove poco. Il tempo lavora per te.*

---

### S2.01 — Covered Call
**Setup:** LONG 100 azioni + SELL 1 call OTM
**Outlook:** neutro — non mi aspetto una mossa esplosiva nel breve
**Parametri paper trading:**
- Strike venduto: delta 0.25–0.30 (circa +5/+7% sopra il prezzo)
- DTE: 30 giorni (ciclo mensile)
- Obiettivo: incassare 1–2% di premio mensile sul valore delle azioni
- Exit anticipo: riacquista la call se vale il 20–25% del premio incassato (hai guadagnato il 75–80%)
- Gestione se va ITM: roll a scadenza successiva allo stesso strike o superiore

---

### S2.02 — Cash-Secured Put
**Setup:** SELL 1 put OTM con cash accantonato = strike × 100
**Outlook:** neutro-rialzista — disposto a comprare il titolo allo strike
**Parametri paper trading:**
- Strike: delta −0.25/−0.30 (circa −5/−7% sotto il prezzo)
- DTE: 30 giorni
- Target premio: ≥1% del valore dello strike
- Exit anticipo: riacquista se vale il 20–25% del premio
- Se va ITM: accetti di ricevere le azioni (era l'obiettivo) oppure fai roll

---

### S2.03 — Bull Put Spread (Credit Spread rialzista)
**Setup:** SELL put strike A + BUY put strike B (A > B), stesso DTE
**Outlook:** neutro-rialzista — il titolo rimane sopra lo strike venduto A
**Parametri paper trading:**
- Strike A venduto: delta −0.25/−0.30
- Strike B comprato: delta −0.10/−0.15 (protezione)
- Larghezza spread: $5–$10
- DTE: 30–45 giorni
- Credito minimo: 30% della larghezza dello spread (es. spread $5 → credito ≥$1.50)
- Exit profitto: chiudi al +50% del credito (hai già incassato metà del massimo guadagno)
- Stop loss: chiudi se il costo di chiusura supera 2× il credito incassato

---

### S2.04 — Bear Call Spread (Credit Spread ribassista)
**Setup:** SELL call strike A + BUY call strike B (A < B), stesso DTE
**Outlook:** neutro-ribassista — il titolo rimane sotto lo strike venduto A
**Parametri paper trading:** speculari al Bull Put Spread
- Strike A venduto: delta 0.25/0.30
- DTE: 30–45 giorni
- Credito minimo: 30% della larghezza dello spread
- Exit: +50% del credito incassato

---

### S2.05 — Wheel Strategy
**Setup:** ciclo CSP → se esercitata, covered call → ripeti
**Outlook:** neutro-rialzista su titolo di qualità che sei disposto a tenere
**Parametri paper trading:**
- Titolo: alta liquidità, IV relativamente alta, fondamentali solidi
- Fase 1: sell CSP delta −0.25, DTE 30 giorni
- Fase 2 (se assegnato): sell covered call delta +0.25/+0.30, DTE 30 giorni
- Obiettivo mensile: 1.5–2.5% di rendimento sul capitale allocato
- Stop wheel: se il titolo perde >20% — valuta se vuoi davvero continuare a tenerlo

---

## SERIE 3 — STRATEGIE SULLA VOLATILITÀ
*Guadagni o perdi in base a quanto si muove il mercato, non alla direzione.*

---

### S3.01 — Long Straddle (pre-earnings)
**Setup:** BUY call ATM + BUY put ATM, stesso strike e stesso DTE
**Outlook:** mossa grande attesa (earnings), direzione incerta
**Parametri paper trading:**
- DTE entrata: 7–14 giorni prima dell'evento (non di più — theta pesa)
- Strike: esattamente ATM
- Budget: max 3% portafoglio
- Exit: entro 24–48h dall'evento (dopo il volatility crush si perde il vantaggio)
- Target: profitto se il titolo si muove più del "breakeven implicito" = premio totale pagato / spot
- Stop: −30% del valore se il titolo non si muove dopo 5 giorni

---

### S3.02 — Short Strangle
**Setup:** SELL call OTM + SELL put OTM, stesso DTE
**Outlook:** mercato laterale, IV alta
**Parametri paper trading:**
- Strike call venduta: delta +0.20/+0.25
- Strike put venduta: delta −0.20/−0.25
- DTE: 30–45 giorni
- Condizione di entrata: IV Rank > 50% (opzioni storicamente care)
- Exit profitto: chiudi al +50% del credito incassato
- Stop loss: chiudi se il valore delle posizioni aperte raggiunge 2× il credito (perdita = credito)
- **Attenzione:** perdita non cappata. Usare solo su sottostanti liquidi e con size ridotto.

---

### S3.03 — Iron Condor
**Setup:** SELL call OTM + BUY call OTM più lontana + SELL put OTM + BUY put OTM più lontana
**Outlook:** mercato laterale entro un range definito
**Parametri paper trading:**
- Leg vendute: delta ±0.20/±0.25 (circa ±5% dall'ATM)
- Leg comprate: delta ±0.10 (circa ±8/10% dall'ATM per cappare la perdita)
- DTE: 30–45 giorni
- Credito netto minimo: 30% della larghezza di uno spread
- Exit profitto: +50% del credito
- Stop loss: se uno dei lati perde 2× il credito totale incassato → chiudi quel lato
- Segnale di entrata ideale: IV Rank > 50%, mercato in fase laterale, nessun earnings nelle prossime 2 settimane

---

### S3.04 — Iron Butterfly
**Setup:** SELL call ATM + BUY call OTM + SELL put ATM + BUY put OTM (call e put vendute allo stesso strike)
**Outlook:** mercato praticamente fermo — più preciso dell'iron condor, credito più alto
**Parametri paper trading:**
- Strike centrale: esattamente ATM
- Wing comprate: ±5/±7% dal centro
- DTE: 21–30 giorni
- Credito: più alto dell'iron condor (zona di profitto più stretta)
- Exit profitto: +25% del credito (zona di profitto piccola, meglio uscire prima)
- Stop loss: se il titolo esce della zona profitto → chiudi il lato perdente

---

### S3.05 — Calendar Spread (usare il Calendar Monitor)
**Setup:** SELL call ATM scadenza vicina + BUY call ATM scadenza lontana, stesso strike
**Outlook:** laterale a breve termine, mossa possibile nel medio termine
**Segnale di entrata dal tool:** Z-Score 30v60 < −0.5 (CHEAP o FAIR basso) sul Calendar Monitor
**Parametri paper trading:**
- Strike: ATM o il più vicino
- Leg venduta: 30 DTE
- Leg comprata: 60 DTE
- Debit pagato: monitorare che il credit% sia inferiore alla media storica
- Exit: quando la leg vicina raggiunge 7–10 DTE (theta accelera troppo) oppure al +30% del debit pagato
- Stop: −50% del debit pagato

---

## SERIE 4 — STRATEGIE LEAPS
*Posizioni a lungo termine. Theta lento, capitale ridotto rispetto alle azioni.*

---

### S4.01 — LEAPS Call come sostituto azionario
**Setup:** BUY call deep ITM, DTE 12–24 mesi, delta 0.75–0.85
**Outlook:** fortemente rialzista di lungo periodo
**Parametri paper trading:**
- Strike: circa −15/−20% sotto il prezzo attuale (deep ITM)
- DTE: 12–18 mesi
- Segnale di entrata: HV Rank < 30% su Coiled Spring (IV compressa = opzioni economiche)
- Costo tipico: 15–25% del valore delle 100 azioni equivalenti
- Exit: quando il titolo supera il target di prezzo oppure a 90 DTE dalla scadenza (roll o chiudi)
- Stop: −40% del premio pagato

---

### S4.02 — Poor Man's Covered Call (PMCC)
**Setup:** BUY LEAPS call deep ITM (12–18 mesi) + SELL call OTM (30 DTE) sullo stesso titolo
**Outlook:** rialzista di lungo termine, neutro nel breve — genera reddito mensile
**Parametri paper trading:**
- LEAPS: delta 0.80+, DTE 12–18 mesi
- Call mensile venduta: delta 0.25–0.30, DTE 30 giorni
- Regola chiave: strike della call venduta deve essere sempre SOPRA il breakeven del LEAPS
- Obiettivo: incassare 1–2% mensile sul valore del LEAPS
- Exit call mensile: riacquista al 50% del credito incassato (dopo 50% del guadagno max)
- Gestione: se la call mensile va ITM, roll a scadenza successiva a strike superiore

---

### S4.03 — LEAPS Put come copertura portafoglio
**Setup:** BUY put OTM su SPY o sul titolo da proteggere, DTE 6–12 mesi
**Outlook:** vuoi proteggere un portafoglio azionario da un drawdown importante
**Parametri paper trading:**
- Strike: −10/−15% sotto il prezzo (assicurazione, non speculazione)
- DTE: 6–12 mesi (lontano dal theta intenso)
- Budget assicurazione: 1–2% del portafoglio per anno
- Non cercare di guadagnarci: è un costo di gestione del rischio, come un'assicurazione auto
- Roll: 90 giorni prima della scadenza, riacquista e riapri a DTE più lungo

---

## Schema di pubblicazione

| Serie | Video | Cadenza suggerita |
|-------|-------|-------------------|
| S1 — Direzionali | 4 video | 1 a settimana |
| S2 — Income | 5 video | 1 a settimana |
| S3 — Volatilità | 5 video | 1 a settimana |
| S4 — LEAPS | 3 video | 1 a settimana |
| **Totale** | **17 video** | **~4 mesi** |

---

## Struttura fissa ogni video (5 minuti)

| Minuto | Contenuto |
|--------|-----------|
| 0:00–0:30 | Nome della strategia + outlook in una frase |
| 0:30–1:30 | Struttura del trade: quante leg, quali strike, quale DTE |
| 1:30–2:30 | Parametri concreti: delta target, DTE, budget, credito/debito minimo |
| 2:30–3:30 | Entry e Exit: quando entri, quando esci in profitto, quando tagli la perdita |
| 3:30–5:00 | Demo live su Coiled Spring: apri il paper trading, costruisci il trade |
