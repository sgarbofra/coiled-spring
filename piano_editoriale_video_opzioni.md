# Piano Editoriale — Video Tutorial: Strategie con le Opzioni
**Coiled Spring Academy**
Versione 1.0 — Luglio 2026

---

## Visione generale

Serie progressiva di video tutorial che porta lo spettatore da zero conoscenze sulle opzioni fino alle strategie multi-leg avanzate. Ogni episodio è autonomo ma costruisce sulle nozioni dei precedenti. Il filo conduttore è sempre la pratica: ogni strategia viene spiegata con un esempio numerico reale, poi mostrata sulla piattaforma Coiled Spring Terminal.

**Formato target:** 12–20 minuti per episodio. Niente padding, niente intro lunghe.
**Tono:** didattico ma diretto. Si spiega come funziona, si mostra il payoff, si dice quando usarla e quando evitarla.
**Lingua:** italiano, con terminologia tecnica in inglese (standard di mercato).

---

## BLOCCO 0 — FONDAMENTA (Episodi 1–7)
*Prerequisiti zero. Chi non capisce questi episodi non può operare con le opzioni.*

---

### Ep. 01 — Cos'è un'opzione: diritti, non obblighi
**Obiettivo:** capire la differenza fondamentale tra possedere un'opzione e possedere il sottostante.
**Concetti chiave:** call vs put, buyer vs seller, premio, strike, scadenza, contratto = 100 azioni.
**Esempio:** compro una call su AAPL strike 200, scadenza 3 mesi, pago $5 di premio.
**Messaggio finale:** un'opzione è un contratto assicurativo. Il buyer paga un premio per un diritto. Il seller incassa il premio assumendo un obbligo.
**Durata:** 12 min

---

### Ep. 02 — Moneyness: ITM, ATM, OTM
**Obiettivo:** capire perché due opzioni con la stessa scadenza costano diversamente.
**Concetti chiave:** in-the-money, at-the-money, out-of-the-money per call e put, intrinsic value vs time value.
**Esempio:** AAPL a $200. Call 180 (ITM), Call 200 (ATM), Call 220 (OTM) — perché costano $22, $8, $2.
**Messaggio finale:** il prezzo di un'opzione è sempre composto da valore intrinseco + valore temporale. Le OTM sono solo valore temporale.
**Durata:** 10 min

---

### Ep. 03 — Il Theta: il nemico del compratore
**Obiettivo:** capire il decadimento temporale e perché le opzioni perdono valore ogni giorno.
**Concetti chiave:** theta decay, curva esponenziale, l'effetto si accelera negli ultimi 30 giorni, weekend theta.
**Esempio:** una call ATM a 60 DTE vale $5. Stessa call a 30 DTE vale $3.50. A 7 DTE vale $1.50. Il sottostante non si è mosso.
**Messaggio finale:** il tempo è il nemico del long e l'alleato del short. Comprare opzioni richiede di avere ragione entro un tempo limite.
**Durata:** 12 min

---

### Ep. 04 — Il Delta: quant'è sensibile la mia opzione
**Obiettivo:** capire delta come misura di sensitività e come proxy di probabilità.
**Concetti chiave:** delta 0→1 per le call, 0→-1 per le put, delta ATM ≈ 0.50, delta come probabilità di scadere ITM, delta hedging concetto base.
**Esempio:** ho una call delta 0.40. AAPL sale di $1, la mia call sale di $0.40.
**Messaggio finale:** il delta dice quanto si muove la tua opzione rispetto al sottostante. È anche la probabilità approssimativa che l'opzione scada in the money.
**Durata:** 14 min

---

### Ep. 05 — Vega e Volatilità Implicita: il motore nascosto del prezzo
**Obiettivo:** capire perché due opzioni identiche possono costare diversamente in momenti diversi.
**Concetti chiave:** implied volatility (IV), vega come sensitività all'IV, IV alta = opzioni care, IV bassa = opzioni economiche, VIX come barometro.
**Esempio:** SPY call ATM a 30 DTE. Con IV al 15% costa $3.20. Con IV al 25% costa $5.40. Stesso strike, stessa scadenza, stesso sottostante.
**Messaggio finale:** la volatilità implicita è il vero prezzo delle opzioni. Comprare con IV alta è comprare caro. Vendere con IV alta è vendere caro.
**Durata:** 15 min

---

### Ep. 06 — Come leggere una option chain
**Obiettivo:** saper navigare una chain di opzioni reale senza perdersi.
**Concetti chiave:** bid/ask/mid, volume, open interest, spread bid-ask come costo di transazione, scelta della scadenza, scelta dello strike.
**Demo live:** chain di SPY su Coiled Spring Terminal. Lettura colonne, filtro per DTE, identificazione delle opzioni liquide.
**Messaggio finale:** una chain mal letta è la prima fonte di perdite evitabili. Prima di fare qualsiasi trade, controlla sempre il bid-ask spread.
**Durata:** 18 min

---

### Ep. 07 — Il Payoff Diagram: visualizzare il rischio
**Obiettivo:** saper leggere e costruire mentalmente il profilo di rischio di qualsiasi strategia.
**Concetti chiave:** asse X = prezzo sottostante a scadenza, asse Y = P&L, breakeven, max profit, max loss, zona di profitto.
**Demo live:** payoff diagram su Coiled Spring Terminal — long call, long put, covered call.
**Messaggio finale:** se non riesci a disegnare il payoff di una strategia, non la stai capendo davvero.
**Durata:** 14 min

---

## BLOCCO 1 — STRATEGIE SEMPLICI (Episodi 8–15)
*Strategie a 1–2 leg. Rischio definito o meccanicamente controllato.*

---

### Ep. 08 — Long Call: comprare il diritto di salire
**Struttura:** BUY 1 call OTM
**Outlook:** fortemente rialzista, con catalizzatore atteso (earnings, FDA, lancio prodotto).
**Profitto:** illimitato sopra il breakeven. **Perdita:** limitata al premio pagato.
**Quando usarla:** IV bassa (CHEAP sul nostro screener), mossa attesa significativa e direzionale.
**Quando evitarla:** IV alta, mercato laterale, senza catalizzatore identificato.
**Errore comune:** comprare OTM troppo spinte per "rischiare poco" — spesso scadono a zero.
**Demo:** scansione su Coiled Spring, filtro delta 0.30–0.40, CS Score > 65.
**Durata:** 15 min

---

### Ep. 09 — Long Put: comprare protezione (o scommettere al ribasso)
**Struttura:** BUY 1 put OTM
**Outlook:** ribassista direzionale, oppure copertura del portafoglio.
**Profitto:** molto elevato se il titolo crolla. **Perdita:** limitata al premio.
**Due usi distinti:** speculativo (scommessa ribassista) vs hedging (assicurazione sul portafoglio long).
**Quando usarla:** dopo un forte rialzo con IV compressa, o prima di eventi rischiosi su posizioni long.
**Demo:** protective put su una posizione AAPL nel portfolio tracker.
**Durata:** 15 min

---

### Ep. 10 — Covered Call: guadagnare sulle azioni che già possiedi
**Struttura:** LONG 100 azioni + SELL 1 call OTM
**Outlook:** neutro-rialzista moderato. Non mi aspetto una mossa esplosiva.
**Profitto:** limitato allo strike venduto + premio incassato. **Perdita:** ridotta del premio, ma illimitata al ribasso.
**Quando usarla:** posizione azionaria già in utile, IV elevata, mercato laterale o lentamente rialzista.
**Messaggio chiave:** la covered call è il modo più diffuso al mondo di generare reddito sulle azioni. Ha un limite: cappare i guadagni su movimenti forti.
**Durata:** 16 min

---

### Ep. 11 — Cash-Secured Put: comprare azioni a sconto
**Struttura:** SELL 1 put OTM con cash accantonato pari a strike × 100
**Outlook:** rialzista moderato. Disposto a comprare il titolo allo strike venduto.
**Profitto:** limitato al premio. **Perdita:** elevata se il titolo crolla (attenuata dal premio).
**Quando usarla:** titolo che vuoi comprare ma preferiresti a un prezzo inferiore. IV elevata per incassare più premio.
**Messaggio chiave:** se la put scade OTM, incasso il premio. Se viene esercitata, compro il titolo allo strike — esattamente dove volevo comprarlo.
**Durata:** 15 min

---

### Ep. 12 — Bull Call Spread: salita rialzista a costo ridotto
**Struttura:** BUY call strike A + SELL call strike B (stesso DTE, B > A)
**Outlook:** rialzista moderato verso strike B.
**Profitto:** massimo = differenza tra strike − premio netto. **Perdita:** massima = premio netto pagato.
**Vantaggio vs long call:** costo ridotto (la call venduta finanzia parte della call comprata).
**Svantaggio:** profitto cappato a B.
**Quando usarla:** rialzo atteso ma non esplosivo, IV moderata-alta.
**Demo:** costruzione spread su SPY, calcolo breakeven, analisi payoff.
**Durata:** 18 min

---

### Ep. 13 — Bear Put Spread: ribasso limitato a costo ridotto
**Struttura:** BUY put strike A + SELL put strike B (stesso DTE, A > B)
**Outlook:** ribassista moderato verso strike B.
**Profitto:** massimo = differenza tra strike − premio netto. **Perdita:** massima = premio netto.
**Speculare al Bull Call Spread:** stesso concetto, direzione opposta.
**Quando usarla:** ribasso atteso ma non violento, alternativa economica alla long put.
**Durata:** 14 min

---

### Ep. 14 — Credit Spread: incassare premi con rischio definito
**Struttura Bull Put Spread:** SELL put strike A + BUY put strike B (A > B, stesso DTE)
**Struttura Bear Call Spread:** SELL call strike A + BUY call strike B (A < B, stesso DTE)
**Outlook:** neutro-direzionale moderato. Non mi aspetto che il titolo attraversi lo strike venduto.
**Profitto:** limitato al credito incassato. **Perdita:** limitata alla differenza tra strike − credito.
**Messaggio chiave:** il credit spread è la strategia base per vendere volatilità con rischio definito. È il mattone fondante di iron condor e iron butterfly.
**Durata:** 18 min

---

### Ep. 15 — LEAPS: opzioni a lungo termine come sostituto azionario
**Struttura:** BUY call deep ITM, scadenza 12–24 mesi
**Outlook:** fortemente rialzista di lungo periodo, con capitale limitato.
**Vantaggio:** leva sul rialzo con perdita massima definita (il premio). Theta molto lento nei LEAPS.
**Quando usarla:** IV compressa (HV Rank basso sul nostro screener), titolo con trend rialzista strutturale.
**Demo live:** scanner Coiled Spring — filtro LEAPS (DTE > 300), HV Rank < 30%, CS Score, payoff diagram.
**Messaggio chiave:** un LEAPS deep ITM si comporta quasi come il titolo (delta 0.80+) ma con rischio massimo definito e capitale impiegato ridotto.
**Durata:** 20 min

---

## BLOCCO 2 — STRATEGIE MEDIE (Episodi 16–24)
*Strategie 2–4 leg. Richiedono comprensione delle greche e gestione attiva.*

---

### Ep. 16 — Long Straddle: profittare dalla grande mossa (in qualsiasi direzione)
**Struttura:** BUY call ATM + BUY put ATM (stesso strike, stesso DTE)
**Outlook:** movimento esplosivo atteso, direzione incerta. Tipico caso: earnings, FDA announcement, FOMC.
**Profitto:** illimitato in entrambe le direzioni sopra i breakeven. **Perdita:** il doppio premio pagato se il titolo non si muove.
**Nemico principale:** il theta e il crush di IV post-evento (il "volatility crush").
**Quando usarla:** prima di eventi con storia di mosse ampie, IV ancora non troppo alta.
**Errore classico:** comprare lo straddle dopo che la IV è già esplosa — si compra l'attesa dell'evento, non l'evento stesso.
**Durata:** 18 min

---

### Ep. 17 — Long Strangle: straddle più economico, zona morta più ampia
**Struttura:** BUY call OTM + BUY put OTM (strike diversi, stesso DTE)
**Outlook:** mossa molto grande attesa, ma si vuole spendere meno dello straddle.
**Vantaggio:** costo inferiore allo straddle. **Svantaggio:** zona morta più ampia — il titolo deve muoversi di più per essere in profitto.
**Quando preferirlo allo straddle:** titolo con storia di mosse molto ampie (supera la zona morta), IV ATM troppo cara.
**Durata:** 14 min

---

### Ep. 18 — Short Strangle: incassare sul mercato che non si muove
**Struttura:** SELL call OTM + SELL put OTM (strike diversi, stesso DTE)
**Outlook:** mercato laterale, bassa volatilità attesa.
**Profitto:** il premio incassato se il titolo rimane nella zona. **Perdita:** teoricamente illimitata in entrambe le direzioni.
**Rischio:** strategia con perdita non cappata. Richiede gestione attiva e margine elevato.
**Quando usarla:** IV molto alta (RICH sul nostro screener), outlook neutro, su sottostanti liquidi con molte scadenze.
**Quando uscire:** stop-loss su delta totale del portafoglio, non aspettare la scadenza se il titolo si muove forte.
**Durata:** 18 min

---

### Ep. 19 — Collar: protezione con capping del profitto
**Struttura:** LONG 100 azioni + BUY put OTM + SELL call OTM (stesso DTE)
**Outlook:** neutro-rialzista, vuoi proteggere un guadagno già esistente.
**Profitto:** cappato allo strike della call venduta. **Perdita:** cappata allo strike della put comprata.
**Costo:** spesso a costo zero o minimo (zero-cost collar) — il premio della call finanzia la put.
**Quando usarla:** posizione azionaria con gain significativo prima di un evento rischioso.
**Durata:** 14 min

---

### Ep. 20 — Calendar Spread: profittare dalla differenza temporale
**Struttura:** SELL call ATM scadenza vicina + BUY call ATM scadenza lontana (stesso strike)
**Outlook:** mercato laterale a breve, con movimento possibile su orizzonte più lungo.
**Profitto:** massimo se il titolo rimane vicino allo strike alla scadenza della leg near. **Perdita:** il debit pagato se il titolo si muove molto.
**Legame con il nostro tool:** il Credit% del Calendar Monitor misura esattamente questa differenza di prezzo normalizzata su spot. Z-score CHEAP = calendar economico da comprare.
**Demo live:** Calendar Monitor su Coiled Spring — identificazione opportunità, lettura z-score, costruzione del trade.
**Durata:** 22 min

---

### Ep. 21 — Diagonal Spread: calendar spread con strike diversi
**Struttura:** BUY call scadenza lontana strike A + SELL call scadenza vicina strike B (B > A)
**Definizione:** incrocia la logica del calendar spread con quella del vertical spread.
**Profitto:** combinazione di theta decay sulla leg vicina + eventuale rialzo del sottostante.
**Quando usarla:** rialzista moderato ma non vuole pagare per una call semplice.
**Concetto chiave:** il diagonal è il modo più flessibile di costruire posizioni temporali direzionali.
**Durata:** 18 min

---

### Ep. 22 — Rolling: gestire le posizioni nel tempo
**Struttura:** non è una strategia di apertura ma di gestione.
**Concetto:** chiudere una posizione in scadenza e riaprirla a una scadenza più lontana (e/o strike diverso).
**Casi d'uso:** covered call che minaccia di essere esercitata, short put che va ITM, LEAPS che si avvicina a 90 DTE.
**Regola pratica:** si fa roll quando si recupera almeno 80% del credito massimo sulla leg vicina.
**Durata:** 16 min

---

### Ep. 23 — Wheel Strategy: ciclo covered call + cash-secured put
**Struttura:** non è una singola strategia ma un ciclo: sell CSP → se esercitata, vendi covered call → se call scade, vendi nuova CSP.
**Outlook:** neutro-rialzista. Si vuole generare reddito continuativo su un titolo che si è disposti a tenere.
**Rischio principale:** il titolo crolla significativamente durante il ciclo — il portafoglio accumula azioni a prezzi non più interessanti.
**Quando funziona:** titoli di qualità elevata, IV alta, trend laterale o lentamente rialzista.
**Durata:** 20 min

---

### Ep. 24 — Ratio Spread: asimmetria del rischio
**Struttura (Bull Ratio Spread):** BUY 1 call ITM + SELL 2 call OTM (stesso DTE)
**Outlook:** rialzista moderato verso lo strike venduto. Paura di forte accelerazione oltre.
**Profitto:** massimo vicino alle call vendute. **Perdita:** nulla se il titolo scende (premi si compensano), ma cresce sopra le strike vendute (naked leg).
**Quando usarla:** rialzo atteso ma non esplosivo, si vuole ridurre o azzerare il costo della strategia.
**Avvertenza:** la leg nuda richiede margine e una gestione attenta.
**Durata:** 18 min

---

## BLOCCO 3 — STRATEGIE COMPLESSE (Episodi 25–35)
*Strategie multi-leg. Richiedono comprensione profonda delle greche, del rischio e gestione del margine.*

---

### Ep. 25 — Iron Condor: incassare sul mercato laterale con rischio definito
**Struttura:** SELL call OTM + BUY call OTM più lontana + SELL put OTM + BUY put OTM più lontana (stesso DTE, 4 leg)
**Outlook:** mercato laterale entro un range definito.
**Profitto:** massimo = credito netto incassato. **Perdita:** massima = differenza tra strike adiacenti − credito.
**Vantaggio vs short strangle:** rischio completamente definito grazie alle wing comprate.
**Parametri standard del benchmark:** sell leg a ±2% dall'ATM, buy leg a ±5%. Credito normalizzato su spot.
**Demo live:** identificazione iron condor su SPY con IV elevata. Lettura del benchmark normalizzato.
**Durata:** 22 min

---

### Ep. 26 — Iron Butterfly: iron condor con strike centrali identici
**Struttura:** SELL call ATM + BUY call OTM + SELL put ATM + BUY put OTM (4 leg, sell leg coincidono all'ATM)
**Outlook:** mercato praticamente fermo vicino allo strike ATM.
**Profitto:** massimo = credito netto (più alto dell'iron condor, zona di profitto più stretta). **Perdita:** definita.
**Differenza con l'iron condor:** zona di profitto più stretta ma credito più alto. Maggior precisione richiesta.
**Quando preferirlo:** mercato che ci si aspetta si consolidi esattamente intorno all'ATM.
**Durata:** 18 min

---

### Ep. 27 — Benchmarking delle strategie: z-score e valore storico
**Obiettivo:** applicare il concetto di benchmark normalizzato (come il nostro Calendar Monitor e Iron Condor Monitor) per decidere quando una strategia è storicamente cara o economica.
**Concetti chiave:** normalizzazione su spot, maturità sintetica costante, z-score 52 settimane, segnali RICH/CHEAP.
**Demo live:** Calendar Monitor + Iron Condor Monitor (quando disponibile) su Coiled Spring. Come usare il z-score per scegliere il timing della strategia.
**Messaggio chiave:** non è sufficiente sapere come si costruisce una strategia — bisogna sapere se il suo costo è storicamente giustificato.
**Durata:** 20 min

---

### Ep. 28 — Gamma Scalping: profittare dalla volatilità realizzata
**Struttura:** BUY straddle ATM + delta hedging dinamico continuo
**Outlook:** la volatilità realizzata sarà superiore alla volatilità implicita pagata.
**Meccanismo:** si compra il gamma con lo straddle, poi si vende delta ogni volta che il titolo si muove (comprando e vendendo il sottostante o future).
**Profitto:** quando HV realizzata > IV pagata. **Perdita:** theta decay se il titolo si muove poco.
**Quando usarla:** IV compressa (HV Rank basso), evento catalizzatore atteso, titoli molto liquidi.
**Legame con il tool:** HV Screener di Coiled Spring identifica esattamente i titoli con IV compressa rispetto alla HV storica.
**Durata:** 25 min

---

### Ep. 29 — Synthetic Positions: replicare azioni con opzioni
**Struttura (Synthetic Long Stock):** BUY call ATM + SELL put ATM (stesso strike, stesso DTE)
**Comportamento:** replica il P&L di 100 azioni con capitale e margine ridotti.
**Applicazioni:** rolling sintetico, sostituzione di posizioni azionarie costose, costruzione di posizioni con leva controllata.
**Synthetic short stock:** esatto contrario — per chi vuole short senza prestito titoli.
**Durata:** 16 min

---

### Ep. 30 — Backspread: long volatility asimmetrico
**Struttura (Call Backspread):** SELL 1 call ITM + BUY 2 call OTM
**Outlook:** fortemente rialzista (mossa esplosiva) oppure neutro-ribassista.
**Profitto:** illimitato sopra le call OTM. **Perdita:** limitata nella zona intermedia tra le strike.
**Quando usarla:** vuoi esposizione long vega con costo ridotto o zero, su titoli con storia di mosse esplosive.
**Differenza col ratio spread:** direzione del rischio invertita.
**Durata:** 18 min

---

### Ep. 31 — LEAPS come piattaforma: strategie a lungo termine
**Struttura:** BUY LEAPS call deep ITM (delta 0.80+) come base per costruire strategie income
**Esempio pratico:** LEAPS call + vendita covered call mensile (Poor Man's Covered Call / PMCC). Riduce drasticamente il capitale richiesto rispetto alla covered call tradizionale.
**Demo live:** PMCC su AAPL tramite Coiled Spring. Calcolo capital efficiency vs covered call standard.
**Legame con il tool:** scanner LEAPS + filtro HV Rank basso = identificazione opportunità.
**Durata:** 22 min

---

### Ep. 32 — Dispersion Trading: volatilità dell'indice vs componenti
**Concetto:** la volatilità implicita di un indice (SPY) è spesso inferiore alla media ponderata delle volatilità dei suoi componenti — la differenza è la "correlazione implicita".
**Trade base:** SELL volatilità sull'indice (iron condor su SPY) + BUY volatilità sui singoli componenti (straddle su AAPL, MSFT, NVDA…).
**Profitto:** se la correlazione realizzata è inferiore a quella implicita (tipica in mercati calmi).
**Quando funziona:** regime di bassa correlazione (mercato calmo senza shock sistemici).
**Legame con il tool:** il Calendar Monitor cross-asset su ETF settoriali vs SPY permette di vedere divergenze nel pricing della term structure.
**Durata:** 25 min

---

### Ep. 33 — Position Sizing e Kelly Criterion per opzioni
**Obiettivo:** rispondere alla domanda pratica più importante: quante opzioni compro/vendo?
**Concetti chiave:** win rate + payoff ratio → Kelly fraction, half-Kelly come prassi sicura, max allocation per singola posizione, gestione del vega aggregato del portafoglio.
**Errore classico:** sizing uguale per tutte le posizioni indipendentemente dal rischio.
**Demo:** calcolo position size su 3 trade diversi (long call, iron condor, LEAPS).
**Durata:** 20 min

---

### Ep. 34 — Greeks aggregati: gestire un portafoglio di opzioni
**Obiettivo:** passare dalla gestione del singolo trade alla gestione del portafoglio complessivo.
**Concetti chiave:** delta netto aggregato (esposizione direzionale), vega netto (esposizione alla IV), theta netto (reddito/costo giornaliero), gamma totale.
**Regola pratica:** monitorare delta, vega e theta a livello di portafoglio almeno settimanalmente.
**Demo live:** portfolio tracker Coiled Spring — lettura delta, vega, theta di posizioni aggregate.
**Durata:** 22 min

---

### Ep. 35 — Gestione degli eventi: earnings, FOMC, FDA
**Obiettivo:** protocollo di gestione delle posizioni aperte in presenza di eventi binari.
**Domande da rispondere:** chiudo prima dell'evento? Riduco il size? Compro protezione? Aspetto il crush post-evento?
**Strategia per l'earnings play:** straddle pre-earnings vs iron condor post-earnings (incassare il crush).
**Regola empirica:** il mercato tende a sopravvalutare la mossa attesa per gli earnings del 20–30%. Verifica storica sul tool.
**Durata:** 20 min

---

## Episodi speciali / Bonus

**BONUS A — Come usare Coiled Spring Terminal: walkthrough completo**
Tour completo della piattaforma: scanner, HV Screener, Opportunity Analysis, Portfolio Tracker, Calendar Monitor, Academy.

**BONUS B — Case Study: costruire un portafoglio di opzioni da zero (€10.000)**
Dalla selezione dei titoli al sizing, alla gestione mensile. Episodio lungo (30–35 min).

**BONUS C — I 10 errori più comuni con le opzioni**
Episodio di review degli errori pratici raccolti nei commenti e nelle domande della community.

---

## Schema di pubblicazione suggerito

| Fase | Episodi | Cadenza | Note |
|------|---------|---------|------|
| Lancio | Ep. 01–07 | 1 a settimana | Fondamenta — pubblicare tutti e 7 in 7 settimane consecutive |
| Espansione | Ep. 08–15 | 1 a settimana | Strategie semplici |
| Intermedio | Ep. 16–24 | 1 ogni 10 giorni | Strategie medie — più complesse da produrre |
| Avanzato | Ep. 25–35 | 1 ogni 2 settimane | Qualità > quantità |
| Bonus | A, B, C | Libero | Da distribuire come reward community |

**Tempistica realistica:** serie completa in 12–14 mesi con cadenza regolare.

---

## Note di produzione

Ogni episodio dovrebbe includere:
- Apertura: "Cosa impari in questo video" (30 secondi)
- Sezione teorica con slide semplici (payoff diagram, formule)
- Demo live su Coiled Spring Terminal quando applicabile
- Riepilogo: "Quando usare / quando evitare / errore comune"
- Nessuna outro lunga — taglio diretto

Il titolo YouTube deve contenere il nome della strategia in chiaro (SEO). Esempio: *"Iron Condor spiegato dall'inizio — con esempi reali e live demo"* — non *"Ep. 25 del corso sulle opzioni"*.
