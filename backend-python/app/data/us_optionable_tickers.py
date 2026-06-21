"""
US Optionable Tickers - Expanded Universe
Includes: Russell 1000 most traded + popular tickers with active options
"""

# Russell 1000 + Popular optionable stocks
# Includes: FAANG, Mega-caps, Growth, Tech, Finance, Energy, Healthcare, Consumer, Industrial
# Special additions: SMCI, HOOD, MSTR, RIVN, RDDT (as requested)

US_OPTIONABLE_TICKERS = [
    # Mega-cap Tech
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA",

    # Large-cap Tech
    "AMD", "INTC", "QCOM", "AVGO", "TXN", "AMAT", "LRCX", "KLAC", "MU", "MRVL",
    "ADI", "NXPI", "MCHP", "ON", "SWKS", "QRVO", "MPWR", "WOLF", "ALGM",

    # Software & Cloud
    "CRM", "ORCL", "ADBE", "NOW", "INTU", "SNOW", "DDOG", "NET", "CRWD", "ZS",
    "PANW", "FTNT", "S", "TEAM", "WDAY", "VEEV", "DOCU", "ZM", "OKTA", "TWLO",
    "PLTR", "U", "PATH", "BILL", "CFLT", "ESTC", "MDB", "FROG",

    # Semiconductors
    "TSM", "ASML", "SMCI",  # ← SMCI added as requested

    # E-commerce & Internet
    "SHOP", "MELI", "SE", "BABA", "JD", "PDD", "UBER", "LYFT", "DASH", "ABNB",

    # Fintech & Finance
    "V", "MA", "PYPL", "SQ", "COIN", "HOOD",  # ← HOOD added as requested
    "JPM", "BAC", "WFC", "C", "GS", "MS", "BLK", "SCHW", "AXP", "COF",

    # Crypto-related
    "MSTR",  # ← MSTR added as requested

    # EV & Auto
    "RIVN",  # ← RIVN added as requested
    "F", "GM", "NIO", "LCID", "XPEV", "LI",

    # Social Media & Communication
    "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "CHTR", "SNAP", "PINS", "MTCH",
    "RDDT",  # ← RDDT added as requested

    # Consumer & Retail
    "WMT", "TGT", "COST", "HD", "LOW", "NKE", "SBUX", "MCD", "CMG", "YUM",
    "LULU", "DECK", "ROST", "TJX", "DG", "DLTR",

    # Healthcare & Biotech
    "UNH", "JNJ", "LLY", "ABBV", "MRK", "TMO", "ABT", "DHR", "PFE", "BMY",
    "AMGN", "GILD", "REGN", "VRTX", "BIIB", "ILMN", "MRNA", "BNTX", "ISRG",

    # Energy
    "XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "HAL",

    # Industrials
    "BA", "CAT", "DE", "GE", "HON", "UPS", "FDX", "RTX", "LMT", "NOC",

    # Materials & Commodities
    "FCX", "NEM", "GOLD", "SCCO",

    # Popular ETFs (with options)
    "SPY", "QQQ", "IWM", "DIA", "EEM", "EFA", "VTI", "VWO",
    "XLE", "XLF", "XLK", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB", "XLRE",
    "SMH", "SOXX", "XBI", "IBB", "KRE", "XRT", "XHB",
    "TLT", "HYG", "LQD", "GLD", "SLV", "USO", "UNG",
    "ARKK", "ARKW", "ARKG", "ARKF", "ARKQ",
    "VGK", "FXI", "EWJ", "EWZ", "RSX", "INDA",

    # Additional high-volume optionable stocks
    "ROKU", "Z", "OPEN", "RDFN", "CPNG", "GRAB", "DIDI",
    "RBLX", "HOOD", "SOFI", "AFRM", "UPST", "LC",
    "SPCE", "GOGO", "JOBY",
    "GME", "AMC", "BBBY", "BB",
    "PLUG", "FCEL", "BE", "CLNE",
    "SPWR", "ENPH", "SEDG", "RUN",
    "AI", "C3AI", "BBAI",
    "BROS", "CELH", "MNST",
    "CRSP", "EDIT", "NTLA", "BEAM",
    "TDOC", "HIMS", "ONEM",
    "PTON", "BYND", "CVNA", "CARVANA",

    # More popular tickers
    "TSCO", "ORLY", "AZO", "GPC",
    "ADSK", "ANSS", "CDNS", "SNPS", "PTC", "AUTODESK",
    "EA", "TTWO", "ATVI", "U", "UNITY",
    "SPOT", "WBD", "PARA", "FOX", "NWSA",
    "SYY", "KR", "SFM", "WBA", "CVS",
    "CI", "HUM", "CVS", "ANTM", "CNC",
]

# Deduplicate and sort
US_OPTIONABLE_TICKERS = sorted(list(set(US_OPTIONABLE_TICKERS)))

# Categorize for better UX
UNIVERSE_BY_CATEGORY = {
    "mega_tech": [
        "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA",
        "AMD", "CRM", "ORCL", "ADBE", "INTC", "QCOM", "AVGO"
    ],
    "ai_software": [
        "PLTR", "SNOW", "DDOG", "NET", "CRWD", "ZS", "PANW", "NOW",
        "C3AI", "AI", "PATH", "SMCI"
    ],
    "fintech": [
        "V", "MA", "PYPL", "SQ", "COIN", "HOOD", "SOFI", "AFRM", "MSTR"
    ],
    "ev_auto": [
        "TSLA", "RIVN", "NIO", "LCID", "F", "GM", "XPEV", "LI"
    ],
    "social_media": [
        "META", "SNAP", "PINS", "RDDT", "MTCH", "NFLX", "DIS", "ROKU"
    ],
    "semiconductors": [
        "NVDA", "AMD", "INTC", "QCOM", "AVGO", "TSM", "ASML", "MU",
        "AMAT", "LRCX", "KLAC", "SMCI"
    ],
    "etf_major": [
        "SPY", "QQQ", "IWM", "DIA", "VTI", "EEM", "EFA"
    ],
    "etf_sector": [
        "XLE", "XLF", "XLK", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB",
        "SMH", "SOXX", "XBI", "IBB", "KRE", "XRT"
    ],
    "etf_commodity": [
        "GLD", "SLV", "USO", "UNG", "TLT", "HYG"
    ],
    "all": US_OPTIONABLE_TICKERS
}
