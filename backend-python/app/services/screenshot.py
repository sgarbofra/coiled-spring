"""
screenshot.py — Optional ScreenshotOne integration for newsletter top candidate.

If SCREENSHOTONE_API_KEY is not configured, get_terminal_screenshot() returns None
and the newsletter job continues without a screenshot (no error raised).
"""
from __future__ import annotations

import os
from typing import Optional

import requests


def get_terminal_screenshot(ticker: str, timeout: int = 20) -> Optional[bytes]:
    """
    Fetch a screenshot of the Coiled Spring terminal page for a given ticker.

    Returns raw JPEG bytes if successful, None otherwise.
    Requires SCREENSHOTONE_API_KEY env var. Safe to call when key is absent.
    """
    api_key = os.getenv("SCREENSHOTONE_API_KEY")
    if not api_key:
        return None

    url = "https://api.screenshotone.com/take"
    params = {
        "access_key":      api_key,
        "url":             f"https://coiledspring.app/scanner/opportunity/{ticker}",
        "viewport_width":  1200,
        "viewport_height": 800,
        "format":          "jpg",
        "image_quality":   80,
    }

    try:
        r = requests.get(url, params=params, timeout=timeout)
        if r.status_code == 200:
            return r.content
        print(f"[SCREENSHOT] ScreenshotOne returned HTTP {r.status_code} for {ticker}")
        return None
    except Exception as e:
        print(f"[SCREENSHOT] Failed for {ticker}: {e}")
        return None
