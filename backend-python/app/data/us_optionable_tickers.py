"""
US Optionable Tickers Universe — Coiled Spring Terminal
Coverage: S&P 500 + S&P MidCap 400 + Major ETFs + High-volume specials
Static base: ~1100 tickers (deduplicated at module load)

Conventions:
  - Yahoo Finance format: dots → dashes (BRK-B, BF-B)
  - Duplicates removed at bottom via set()
  - Wikipedia S&P 500 fetch supplements at runtime via get_iv_snapshot_universe()
"""

# ── S&P 500 (full list, dot→dash) ─────────────────────────────────────────────
_SP500 = [
    "MMM","AOS","ABT","ABBV","ACN","ADBE","AMD","AES","AFL","A",
    "APD","ABNB","AKAM","ALB","ARE","ALGN","ALLE","LNT","ALL","GOOGL",
    "GOOG","MO","AMZN","AMCR","AEE","AAL","AEP","AXP","AIG","AMT",
    "AWK","AMP","AME","AMGN","APH","ADI","ANSS","AON","APA","AAPL",
    "AMAT","APTV","ACGL","ADM","ANET","AJG","AIZ","T","ATO","ADSK",
    "AZO","AVB","AVY","AXON","BKR","BALL","BAC","BK","BBWI","BAX",
    "BDX","BRK-B","BBY","BIO","TECH","BIIB","BLK","BX","BA","BCR",
    "BMY","AVGO","BR","BRO","BF-B","BLDR","BSX","BKNG","BWA","BXP",
    "CHRW","CDNS","CZR","CPT","CPB","COF","CAH","KMX","CCL","CARR",
    "CTLT","CAT","CBOE","CBRE","CDW","CE","COR","CNC","CNP","CF",
    "CHTR","CVX","CMG","CB","CHD","CI","CINF","CTAS","CSCO","C",
    "CFG","CLX","CME","CMS","KO","CTSH","CL","CMCSA","CMA","CAG",
    "COP","ED","STZ","CEG","COO","CPRT","GLW","CTVA","CSGP","COST",
    "CTRA","CCI","CSX","CMI","CVS","DHI","DHR","DRI","DVA","DAY",
    "DE","DECK","DAL","XRAY","DVN","DXCM","FANG","DLR","DFS","DG",
    "DLTR","D","DPZ","DOV","DOW","DHR","DTE","DUK","DD","EMN",
    "ETN","EBAY","ECL","EIX","EW","EA","ELV","LLY","EMR","ENPH",
    "ETR","EOG","EPAM","EQT","EFX","EQIX","EQR","EL","ETSY","EG",
    "EVRG","ES","EXC","EXPE","EXPD","EXR","XOM","FFIV","FDS","FICO",
    "FAST","FRT","FDX","FIS","FITB","FSLR","FE","FI","FLT","FMC",
    "F","FTIV","BEN","FCX","GRMN","IT","GE","GEHC","GEN","GNRC",
    "GD","GIS","GM","GPC","GILD","GPN","GL","GS","HAL","HIG",
    "HAS","HCA","DOC","HSIC","HSY","HES","HPE","HLT","HOLX","HD",
    "HON","HRL","HST","HWM","HPQ","HUBB","HUM","HBAN","HII","IBM",
    "IEX","IDXX","ITW","ILMN","INCY","IR","PODD","INTC","ICE","IFF",
    "IP","IPG","INTU","ISRG","IVZ","INVH","IQV","IRM","JBHT","JKHY",
    "J","JBL","JNPR","JPM","JNPR","K","KVUE","KDP","KEY","KEYS",
    "KMB","KIM","KMI","KLAC","KHC","KR","LHX","LH","LRCX","LW",
    "LVS","LDOS","LEN","LIN","LYV","LKQ","LMT","L","LOW","LULU",
    "LYB","MTB","MRO","MPC","MKTX","MAR","MMC","MLM","MAS","MA",
    "MTCH","MKC","MCD","MCK","MDT","MRK","META","MET","MTD","MGM",
    "MCHP","MU","MSFT","MAA","MRNA","MHK","MOH","TAP","MDLZ","MPWR",
    "MNST","MCO","MS","MOS","MSI","MSCI","NDAQ","NTAP","NOV","NWSA",
    "NWS","NEE","NKE","NEM","NFLX","NI","NDSN","NSC","NTRS","NOC",
    "NCLH","NRG","NUE","NVDA","NVR","NXPI","ORLY","OXY","ODFL","OMC",
    "ON","OKE","ORCL","OTIS","PCAR","PKG","PANW","PH","PAYX","PAYC",
    "PYPL","PNR","PEP","PFE","PCG","PM","PSX","PNW","PXD","PNC",
    "POOL","PPG","PPL","PFG","PG","PGR","PLD","PRU","PEG","PTC",
    "PSA","PHM","QRVO","PWR","QCOM","DGX","RL","RJF","RTX","O",
    "REG","REGN","RF","RSG","RMD","RVTY","ROK","ROL","ROP","ROST",
    "RCL","SPGI","CRM","SBAC","SLB","STX","SEE","SRE","NOW","SHW",
    "SPG","SWKS","SJM","SNA","SOLV","SO","LUV","SWK","SBUX","STT",
    "STLD","STE","SYK","SMCI","SYF","SNPS","SYY","TMUS","TROW","TTWO",
    "TPR","TRGP","TGT","TEL","TDY","TFX","TER","TSLA","TIF","TMO",
    "TRMB","TJX","TSCO","TT","TDG","TRVG","TRV","TRMK","TFC","TYL",
    "TSN","USB","UBER","UDR","ULTA","UNP","UAL","UPS","URI","UNH",
    "UHS","VLO","VTR","VLTO","VRSN","VRSK","VZ","VRTX","VLNT","VFC",
    "V","ARM","VST","VWR","WRB","GWW","WAB","WBA","WMT","WBD",
    "WM","WAT","WEC","WFC","WELL","WST","WDC","WRK","WY","WHR",
    "WMB","WTW","WDAY","WYNN","XEL","XYL","YUM","ZBRA","ZBH","ZION",
    "ZTS",
]

# ── S&P MidCap 400 (most liquid/optionable subset ~350) ───────────────────────
_SP400 = [
    "AAN","AB","ABCB","ABG","ABM","ACC","ACHC","ACI","ACM","AEO",
    "AFG","AGCO","AGO","AIN","AIT","AL","ALK","ALEX","AM","AMC",
    "AMCX","AME","AMED","AMRC","AN","ANDE","ANF","AOS","APAM","APG",
    "APOG","ARW","ASB","ASH","ASGN","ASO","ATI","ATO","AVT","AWR",
    "AX","AXL","AXS","B","BANF","BANR","BCO","BDC","BFH","BGS",
    "BHF","BIG","BIO","BJRI","BKH","BLKB","BMI","BOH","BOX","BPOP",
    "BRC","BRX","BUSE","BWA","CABO","CAL","CALM","CATY","CBRL","CBT",
    "CCOI","CDW","CENX","CFR","CHCO","CHE","CIEN","CIT","CIVI","CKH",
    "CLF","CLH","CMA","CMC","CNMD","CNO","CNX","COHU","COLB","COLM",
    "CPB","CPRI","CPS","CR","CRC","CRI","CRVL","CSL","CW","CWT",
    "DGX","DKS","DLX","DO","DOOR","DRH","DY","EAT","EBC","EEFT",
    "EME","ENR","ENVA","EPAC","EPC","EPR","EPRT","ESCO","ESE","ESRT",
    "EVR","EXP","EXPO","EXTR","EZPW","FARO","FBP","FCNCA","FCPT","FG",
    "FIVE","FL","FLR","FORM","FR","FUL","FUN","GBX","GFF","GHM",
    "GMS","GPRE","GVA","HAIN","HARL","HBI","HCC","HCI","HCSG","HGV",
    "HIBB","HIW","HNI","HOMB","HOME","HOV","HP","HTZ","HWC","IBP",
    "IBOC","ICFI","IDCC","IIIN","J","JACK","JAX","JBL","JELD","JHG",
    "JLL","JWN","KAI","KAR","KFY","KMT","KN","KNX","KOP","KRC",
    "KRG","KSS","LB","LCI","LGF-A","LKFN","LMAT","LNC","LNTH","LPX",
    "LSTR","LW","LXP","M","MAC","MATX","MC","MCS","MDC","MERC",
    "MHO","MKL","MLM","MLR","MOG-A","MRC","MRCY","MSA","MSM","MTG",
    "MTSI","MTZ","MWA","NAD","NBTB","NCR","NEU","NFG","NHC","NIC",
    "NNN","NRC","NRG","NSIT","NUS","NVST","NVT","NWBI","NWL","NXRT",
    "NXST","NYT","OII","OLN","OMCL","OMF","ONTO","OPI","OSK","OWL",
    "OXM","PACW","PAG","PAHC","PAR","PATK","PCRX","PDM","PEBO","PEB",
    "PFBC","PFS","PGTI","PII","PINC","PKG","PLXS","PMTC","PNM","PNFP",
    "POOL","POWL","PRGS","PRKS","PRO","PRVA","PSB","PSMT","PTCT","PVH",
    "R","RAMP","RCII","RCM","RDN","RE","RES","REXR","RLI","RLJ",
    "RLGY","RMD","ROCK","ROG","ROIC","RUSHA","SAFE","SAIA","SANM","SASR",
    "SBH","SCI","SCSC","SEIC","SF","SGH","SGMS","SHOO","SHYF","SIG",
    "SITC","SJM","SKT","SKX","SLG","SLGN","SM","SMPL","SNA","SNDR",
    "SNV","SSD","SSYS","STAG","STC","SUI","SUM","SUPN","SWK","SYNA",
    "SXI","SXT","SYBT","SYNH","TAST","TBI","TCBK","TCMD","TGNA","THG",
    "THO","TKR","TMHC","TOWN","TR","TRMK","TRS","TRTN","TRU","TRUP",
    "TUP","TWI","TXRH","UFPI","UGI","UNF","UNVR","UVV","VALE","VBTX",
    "VICR","VIRT","VLY","VNO","VRTS","VSH","WABC","WBS","WDFC","WEN",
    "WEX","WFRD","WHR","WK","WKC","WLK","WRLD","WSO","WTS","WU",
    "WY","XRX","YORW","ZI","ZION","ZWS",
]

# ── High-volume specials (meme, crypto-adjacent, EV, biotech) ──────────────────
_SPECIAL = [
    # Meme / alta volatilità
    "GME","AMC","BB","KOSS","EXPR","BBBY",
    # Crypto-adjacent
    "COIN","MSTR","RIOT","MARA","CLSK","HUT","BTBT","CIFR","BTDR",
    # EV
    "RIVN","LCID","NIO","XPEV","LI","BLNK","CHPT","EVGO","WKHS",
    # Biotech speculative
    "MRNA","BNTX","NVAX","SGEN","ALNY","ARWR","BEAM","CRSP","EDIT","NTLA",
    "RXRX","HIMS","LMND","ROOT","DKNG","PENN",
    # Social media / consumer tech
    "SNAP","PINS","RDDT","SPOT","HOOD","SOFI","AFRM","UPST","SQ",
    # Popular software
    "PLTR","SNOW","DDOG","NET","CRWD","ZS","PANW","S","PATH","BILL",
    "CFLT","MDB","ESTC","GTLB","SAMSF","RBLX","U","DOCN","FTNT",
    # Legacy tech
    "IBM","HPE","HPQ","DELL","NCR","NTAP","WDC","STX",
    # Others high-vol
    "CVNA","PTON","BYND","TDOC","OPEN","ROKU","AI","BBAI","JOBY",
    "SPCE","PLUG","FCEL","BE","CLNE","ENPH","SEDG","SHOP","MELI",
    "SE","BABA","JD","PDD","UBER","LYFT","DASH","ABNB","CPNG",
]

# ── ETFs con opzioni liquide ───────────────────────────────────────────────────
_ETFS = [
    # Broad market
    "SPY","IVV","VOO","QQQ","DIA","IWM","IWF","IWD","RSP","VTI",
    "VUG","VTV","VXUS","EFA","EEM","VWO","IEFA","ACWI","MDY","IJH",
    # Sectors SPDR
    "XLK","XLV","XLF","XLE","XLI","XLB","XLY","XLP","XLU","XLRE","XLC",
    "XBI","XHB","XME","XOP","XRT","XSD","XSW","XTN","XAR",
    # Sectors iShares / Vanguard
    "VGT","IBB","IHI","IHF","IGN","ITA","IAI","IAT","IAK","IYT",
    "IYW","IYH","IYF","IYE","IYJ","IYM","IYC","IYK","IDU","IYR",
    # Tech / growth
    "ARKK","ARKG","ARKW","ARKF","ARKX","ARKQ",
    "CIBR","CLOU","HACK","BUG","WCLD","SKYY","IGV","FDN","PNQI",
    # Volatility
    "VXX","UVXY","SVXY","VIXY","VXZ","VIXM",
    # Leveraged (alta volatilità, molto scambiate)
    "TQQQ","SQQQ","UPRO","SPXS","SPXU","TNA","TZA","UDOW","SDOW",
    "SOXL","SOXS","TECL","TECS","FNGU","FNGD","LABU","LABD",
    # Bonds / rates
    "TLT","IEF","SHY","AGG","LQD","HYG","JNK","BND","VCSH","VCIT",
    "TBT","TBF","TMV","TMF","ZROZ","EDV","VGLT","GOVT","MUB","PFF",
    # Commodities
    "GLD","IAU","SLV","PDBC","DJP","GSG","DBC","CPER","PALL","PPLT",
    "SGOL","GLDM","BAR","USO","UCO","SCO","BNO","UNG","BOIL","KOLD",
    "CORN","SOYB","WEAT","NIB","JO","DBA","DBB","DBE","DBO",
    # International
    "EWJ","EWZ","EWC","EWG","EWU","EWL","EWQ","EWA","EWH","EWS",
    "EWT","EWY","EWW","EWM","EWP","EWI","EWD","EWN","EWO","EWK",
    "FXI","KWEB","CQQQ","MCHI","ASHR","GXC",
    # Real estate
    "VNQ","SCHH","IYR","XLRE","RWR","REZ","REM","MORT",
    # Dividends / factor
    "VYM","SCHD","DVY","HDV","DGRO","SDY","MTUM","VLUE","QUAL","USMV",
    # Semis
    "SMH","SOXX","SOXQ","PSI",
    # Healthcare / biotech specifici
    "XBI","IBB","IHI","ARKG","BBH","FBT",
]

# ── Flat universe (deduplicato) ───────────────────────────────────────────────
US_OPTIONABLE_TICKERS: list[str] = sorted(set(
    _SP500 + _SP400 + _SPECIAL + _ETFS
))

# ── Categorie per UI ──────────────────────────────────────────────────────────
UNIVERSE_BY_CATEGORY: dict[str, list[str]] = {
    "STOCKS":  sorted(set(_SP500 + _SP400)),
    "SPECIALI": sorted(set(_SPECIAL)),
    "ETF":     sorted(set(_ETFS)),
    "ALL":     US_OPTIONABLE_TICKERS,
}

# Cache runtime S&P 500 (fetch Wikipedia a caldo)
_SP500_CACHE: list = []


def get_iv_snapshot_universe() -> list[str]:
    """
    Universo completo per daily IV snapshot (APScheduler).

    Usa la lista statica (~1100 ticker) come base.
    Se Wikipedia è raggiungibile, integra con S&P 500 aggiornato.
    Esclude ETF con leva/inversi (IV rumorosa).
    """
    global _SP500_CACHE

    # Fetch S&P 500 da Wikipedia (run once, poi cache)
    if not _SP500_CACHE:
        try:
            import pandas as pd
            tables = pd.read_html(
                "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
                timeout=15,
            )
            raw = tables[0]["Symbol"].tolist()
            # Wikipedia usa "." (BRK.B), yfinance vuole "-" (BRK-B)
            _SP500_CACHE = [t.replace(".", "-") for t in raw]
            print(f"[UNIVERSE] Wikipedia S&P 500: {len(_SP500_CACHE)} tickers")
        except Exception as exc:
            print(f"[UNIVERSE] Wikipedia fetch failed ({exc}), using static list")
            _SP500_CACHE = []

    # Escludi ETF con leva/inversi (IV molto rumorosa)
    _LEVERAGED_PREFIXES = (
        "UVXY","SVXY","TVIX","VXX","VIXY",
        "TQQQ","SQQQ","UPRO","SPXS","SPXU",
        "SOXL","SOXS","TECL","TECS","FNGU","FNGD",
        "LABU","LABD","TNA","TZA","UDOW","SDOW",
        "BOIL","KOLD","UCO","SCO","TMV","TMF",
        "TBT","TBF",
    )

    universe = sorted(set(US_OPTIONABLE_TICKERS) | set(_SP500_CACHE))
    universe = [t for t in universe if not any(t.startswith(p) for p in _LEVERAGED_PREFIXES)]

    print(f"[UNIVERSE] Snapshot universe: {len(universe)} tickers")
    return universe
