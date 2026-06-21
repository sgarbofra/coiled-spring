#!/usr/bin/env python3
"""
Script per stimare quanti ticker USA hanno opzioni disponibili su Yahoo Finance.

Scarica tutti i ticker SEC e testa un campione casuale per vedere
quanti hanno opzioni tradabili.
"""

import json
import random
import time
from typing import Dict, List

import requests
import yfinance as yf


def fetch_sec_tickers() -> Dict[str, str]:
    """Scarica tutti i ticker USA dal dataset SEC EDGAR."""
    print("[*] Downloading SEC ticker list...")
    url = "https://www.sec.gov/files/company_tickers.json"

    headers = {
        "User-Agent": "Coiled Spring Research contact@coiledspring.app",
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    data = response.json()

    # Build ticker -> company name dict
    ticker_to_name = {}
    for entry in data.values():
        ticker = entry.get("ticker")
        title = entry.get("title")
        if ticker and title:
            ticker_to_name[ticker.upper()] = title

    print(f"[+] Loaded {len(ticker_to_name)} SEC tickers\n")
    return ticker_to_name


def check_ticker_has_options(ticker: str) -> bool:
    """Verifica se un ticker ha opzioni disponibili su yfinance."""
    try:
        t = yf.Ticker(ticker)
        # Check if ticker has options expirations
        return len(t.options) > 0
    except Exception:
        return False


def main():
    print("=" * 80)
    print("COILED SPRING - Options Universe Checker")
    print("=" * 80)
    print()

    # Step 1: Download SEC tickers
    ticker_to_name = fetch_sec_tickers()
    all_tickers = list(ticker_to_name.keys())
    total_tickers = len(all_tickers)

    # Step 2: Sample 200 random tickers
    sample_size = 200
    print(f"[*] Selecting random sample of {sample_size} tickers...")
    sample_tickers = random.sample(all_tickers, sample_size)
    print(f"[+] Sample selected\n")

    # Step 3: Test each ticker for options
    print(f"[*] Testing {sample_size} tickers for options availability...")
    print("This may take 3-5 minutes...\n")

    tickers_with_options = []
    tickers_without_options = []

    for i, ticker in enumerate(sample_tickers, 1):
        has_options = check_ticker_has_options(ticker)

        if has_options:
            tickers_with_options.append(ticker)
            status = "+"
        else:
            tickers_without_options.append(ticker)
            status = "-"

        # Progress indicator every 10 tickers
        if i % 10 == 0:
            pct = (i / sample_size) * 100
            with_opt = len(tickers_with_options)
            print(f"  Progress: {i}/{sample_size} ({pct:.0f}%) - With options: {with_opt}/{i}")

        # Small delay to avoid rate limiting
        time.sleep(0.1)

    # Step 4: Calculate statistics
    options_count = len(tickers_with_options)
    options_pct = (options_count / sample_size) * 100
    estimated_total = int((options_pct / 100) * total_tickers)

    # Step 5: Print results
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print()
    print(f"SEC Ticker Universe (USA):")
    print(f"  Total tickers in SEC database: {total_tickers:,}")
    print()
    print(f"Sample Analysis:")
    print(f"  Sample size: {sample_size}")
    print(f"  Tickers with options: {options_count}/{sample_size} ({options_pct:.1f}%)")
    print(f"  Tickers without options: {len(tickers_without_options)}/{sample_size} ({100-options_pct:.1f}%)")
    print()
    print(f"Estimated Scanner Universe:")
    print(f"  ~{estimated_total:,} sottostanti con opzioni disponibili")
    print(f"  (basato su {options_pct:.1f}% del campione)")
    print()

    # Show some examples
    print("Examples of tickers WITH options:")
    for ticker in tickers_with_options[:10]:
        name = ticker_to_name.get(ticker, "Unknown")
        print(f"  [+] {ticker:6s} - {name[:50]}")

    print()
    print("Examples of tickers WITHOUT options:")
    for ticker in tickers_without_options[:10]:
        name = ticker_to_name.get(ticker, "Unknown")
        print(f"  [-] {ticker:6s} - {name[:50]}")

    print()
    print("=" * 80)
    print()

    # Final summary in requested format
    print("SUMMARY")
    print("-" * 80)
    print(f"Ticker SEC totali: {total_tickers:,}")
    print(f"Campione testato: {sample_size}")
    print(f"Con opzioni disponibili: {options_count}/{sample_size} ({options_pct:.1f}%)")
    print(f"Stima universo scanner: ~{estimated_total:,} sottostanti")
    print("=" * 80)


if __name__ == "__main__":
    main()
