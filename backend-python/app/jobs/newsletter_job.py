"""
newsletter_job.py — Newsletter generation job for Coiled Spring Terminal.

Pipeline (Phase 1 — Draft only, no Substack):
  1. SCAN   — query HVSnapshot for compressed tickers, run options scan via scanner_service
  2. AI     — generate educational summaries in parallel (direct Anthropic, no HTTP call)
  3. CONTEXT — fetch VIX close and HV universe stats
  4. RENDER  — Jinja2 HTML template
  5. EMAIL   — send draft to admin via Resend
  6. LOG     — update newsletter_log record
  7. ALERT   — send critical error email on failure

Called by: POST /api/internal/newsletter/generate (internal.py router)
Trigger:   Railway Cron — every Monday at 19:30 UTC
"""
from __future__ import annotations

import asyncio
import os
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import anthropic
import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.config import settings
from app import models
from app.services.scanner_service import (
    run_newsletter_scan,
    ScanCandidate,
    CS_SCORE_VERSION,
)


# ── AI configuration ──────────────────────────────────────────────────────────

NEWSLETTER_SYSTEM_PROMPT = (
    "You are writing a short educational note for an options research newsletter. "
    "Use only the numerical information provided. "
    "Do not infer news, earnings, catalysts, fundamentals or future price direction "
    "unless explicitly supplied. "
    "Do not use the words 'buy', 'sell', 'recommend', 'opportunity' or 'trade to execute'. "
    "Explain why the contract was flagged by the screener. "
    "Mention one relevant risk or limitation. "
    "End with one factual observation about the relationship between implied and historical volatility. "
    "Maximum three sentences. Tone: analytical, accessible and cautious."
)

_USER_PROMPT_TPL = """\
You are writing for a Substack financial newsletter. Keep the tone analytical but \
accessible. Do not use the word 'opportunity'. Max 3 sentences. \
End with one concrete observation on the IV/HV spread.

Ticker: {ticker}
CS Score: {cs_score} (CS Score v{score_version})
HV Rank: {hv_rank}%
IV (ATM 30d): {iv}%
HV30: {hv30}%
Bid/Ask: ${bid} / ${ask}
Spread: {spread_pct}%
Last: ${last}
"""

# Words that must not appear in AI output — auto-rejected → fallback
_FORBIDDEN: frozenset[str] = frozenset([
    "buy", "sell", "guaranteed", "target price", "recommendation",
    "strong upside", "likely to explode", "recommended", "action required",
    "best trade", "top opportunity",
])

_FALLBACK_TPL = (
    "The ticker was flagged because its current HV Rank is in the lower part of its "
    "historical range, while the contract meets the scanner's minimum liquidity and "
    "score requirements. The setup still requires verification of earnings timing, "
    "bid/ask quality and the reliability of the available IV history. "
    "Current implied volatility is {direction} HV30 by {diff:.1f} percentage points."
)


# ── AI helpers ────────────────────────────────────────────────────────────────

def _fallback_summary(c: ScanCandidate) -> str:
    hv30 = c.hv30 or 0.0
    diff = abs(c.iv - hv30)
    direction = "above" if c.iv > hv30 else ("below" if c.iv < hv30 else "close to")
    return _FALLBACK_TPL.format(direction=direction, diff=diff)


def _is_output_valid(text: str) -> bool:
    lower = text.lower()
    return not any(word in lower for word in _FORBIDDEN)


async def _ai_summary(c: ScanCandidate, api_key: str) -> str:
    """Generate educational AI summary for one candidate. No HTTP call — direct Anthropic."""
    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=20.0)

    hv_rank_str = f"{c.hv_rank:.1f}" if c.hv_rank is not None else "N/A"
    hv30_str    = f"{c.hv30:.1f}"    if c.hv30    is not None else "N/A"

    prompt = _USER_PROMPT_TPL.format(
        ticker       = c.ticker,
        cs_score     = c.cs_score_value,
        score_version= CS_SCORE_VERSION,
        hv_rank      = hv_rank_str,
        iv           = round(c.iv, 1),
        hv30         = hv30_str,
        bid          = round(c.bid, 2),
        ask          = round(c.ask, 2),
        spread_pct   = round(c.spread_pct, 1),
        last         = round(c.last, 2),
    )

    resp = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        system=NEWSLETTER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    text = (resp.content[0].text if resp.content else "").strip()

    if not text or not _is_output_valid(text):
        print(f"[NEWSLETTER_JOB] AI output rejected for {c.ticker} — using fallback")
        return _fallback_summary(c)
    return text


async def _safe_summary(c: ScanCandidate, api_key: str) -> str:
    """Wrapper with timeout + exception safety."""
    try:
        return await asyncio.wait_for(_ai_summary(c, api_key), timeout=15.0)
    except Exception as e:
        print(f"[NEWSLETTER_JOB] AI error for {c.ticker} ({type(e).__name__}): {e}")
        return _fallback_summary(c)


# ── Market context ────────────────────────────────────────────────────────────

def _get_market_context(db: Session) -> dict:
    """Fetch VIX and HV universe stats. All fields have safe N/A fallbacks."""
    vix_close    = "N/A"
    yield_spread = "N/A"
    low_hv_count = 0
    low_hv_delta = "+0"

    try:
        import yfinance as yf
        vix   = yf.Ticker("^VIX")
        price = vix.fast_info.last_price or vix.fast_info.previous_close
        if price:
            vix_close = f"{float(price):.1f}"
    except Exception as e:
        print(f"[NEWSLETTER_JOB] VIX fetch failed: {e}")

    try:
        low_hv_count = (
            db.query(models.HVSnapshot)
            .filter(
                models.HVSnapshot.hv_rank <= 25,
                models.HVSnapshot.hv_rank.isnot(None),
            )
            .count()
        )
    except Exception as e:
        print(f"[NEWSLETTER_JOB] HV count query failed: {e}")

    return {
        "vix_close":    vix_close,
        "yield_spread": yield_spread,
        "low_iv_count": low_hv_count,
        "low_iv_delta": low_hv_delta,
    }


# ── HTML rendering ────────────────────────────────────────────────────────────

def _render_html(
    date_str: str,
    setups_found: int,
    market: dict,
    candidates_data: List[dict],
) -> str:
    template_dir = Path(__file__).parent.parent / "templates"
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(["html"]),
    )
    tpl = env.get_template("newsletter.html")
    return tpl.render(
        date_str      = date_str,
        setups_found  = setups_found,
        vix_close     = market["vix_close"],
        yield_spread  = market["yield_spread"],
        low_iv_count  = market["low_iv_count"],
        low_iv_delta  = market["low_iv_delta"],
        candidates    = candidates_data,
    )


# ── Email helpers ─────────────────────────────────────────────────────────────

def _admin_email() -> str:
    return os.getenv("NEWSLETTER_ADMIN_EMAIL") or settings.admin_email


def _send_draft_email(html: str, date_str: str) -> bool:
    resend.api_key = settings.resend_api_key
    to = _admin_email()
    try:
        resend.Emails.send({
            "from":    "Coiled Spring <noreply@coiledspring.app>",
            "to":      [to],
            "subject": f"Coiled Spring Weekly Scan — {date_str} [BOZZA]",
            "html":    html,
        })
        print(f"[NEWSLETTER_JOB] Draft sent to {to}")
        return True
    except Exception as e:
        print(f"[NEWSLETTER_JOB] Email send failed: {e}")
        return False


def _send_alert(subject: str, body: str) -> None:
    """Send critical error alert to admin. Never raises."""
    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from":    "Coiled Spring <noreply@coiledspring.app>",
            "to":      [_admin_email()],
            "subject": f"[ALERT] {subject}",
            "html":    f"<pre style='font-family:monospace;font-size:13px'>{body}</pre>",
        })
    except Exception:
        pass


# ── Optional screenshot ───────────────────────────────────────────────────────

def _get_screenshot(ticker: str) -> Optional[bytes]:
    try:
        from app.services.screenshot import get_terminal_screenshot
        return get_terminal_screenshot(ticker)
    except Exception:
        return None


# ── Main job ──────────────────────────────────────────────────────────────────

async def run_newsletter_job(db: Session, run_id: int) -> None:
    """
    Main newsletter job. Updates the NewsletterLog record identified by run_id.

    Args:
        db:     SQLAlchemy session (background task session — caller must close it)
        run_id: id of the NewsletterLog record created by the endpoint
    """
    log = db.query(models.NewsletterLog).filter(models.NewsletterLog.id == run_id).first()
    if not log:
        print(f"[NEWSLETTER_JOB] Log record {run_id} not found — aborting")
        return

    run_date = log.run_date or datetime.now(timezone.utc)
    date_str = run_date.strftime("%B %d, %Y")

    try:
        # ── STEP 1: SCAN ──────────────────────────────────────────────────────
        hv_rank_max   = float(os.getenv("NEWSLETTER_MAX_HV_RANK",    "25"))
        cs_score_min  = int(os.getenv("NEWSLETTER_MIN_CS_SCORE",     "65"))
        max_candidates= int(os.getenv("NEWSLETTER_MAX_CANDIDATES",   "6"))

        print(f"[NEWSLETTER_JOB] run_id={run_id} | Starting scan | "
              f"hv_rank_max={hv_rank_max} cs_score_min={cs_score_min} limit={max_candidates}")

        candidates, setups_found = run_newsletter_scan(
            db            = db,
            hv_rank_max   = hv_rank_max,
            cs_score_min  = cs_score_min,
            limit         = max_candidates,
        )

        # Update scan stats
        log.tickers_scanned = (
            db.query(models.HVSnapshot)
            .filter(models.HVSnapshot.hv_rank.isnot(None))
            .count()
        )
        log.setups_found = setups_found
        db.commit()

        market = _get_market_context(db)

        # Handle zero candidates (not a critical error — just an empty week)
        if not candidates:
            print("[NEWSLETTER_JOB] No candidates found this week")
            html = _render_html(date_str, 0, market, [])
            _send_draft_email(html, date_str)
            log.tickers_published = 0
            log.status = "success"
            db.commit()
            return

        # ── STEP 2: AI SUMMARIES (parallel, timeout 15s each) ─────────────────
        api_key = settings.anthropic_api_key
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not configured — cannot generate AI summaries")

        summaries: list[str] = list(
            await asyncio.gather(*[_safe_summary(c, api_key) for c in candidates])
        )

        # ── STEP 3: BUILD CANDIDATES DATA FOR TEMPLATE ────────────────────────
        candidates_data = [
            {
                "ticker":     c.ticker,
                "cs_score":   c.cs_score_value,
                "hv_rank":    f"{c.hv_rank:.1f}" if c.hv_rank is not None else "N/A",
                "iv":         f"{c.iv:.1f}",
                "hv30":       f"{c.hv30:.1f}" if c.hv30 is not None else "N/A",
                "bid":        f"{c.bid:.2f}",
                "ask":        f"{c.ask:.2f}",
                "spread_pct": f"{c.spread_pct:.1f}",
                "last":       f"{c.last:.2f}",
                "ai_summary": summary,
            }
            for c, summary in zip(candidates, summaries)
        ]

        # Optional screenshot of top candidate
        _get_screenshot(candidates[0].ticker)   # result not used in Phase 1

        # ── STEP 4: RENDER HTML ───────────────────────────────────────────────
        html = _render_html(date_str, setups_found, market, candidates_data)

        # ── STEP 5: SEND EMAIL ────────────────────────────────────────────────
        sent = _send_draft_email(html, date_str)
        if not sent:
            raise RuntimeError("Failed to send draft email via Resend")

        # ── DONE ──────────────────────────────────────────────────────────────
        log.tickers_published = len(candidates)
        log.status = "success"
        db.commit()
        print(f"[NEWSLETTER_JOB] Done — {len(candidates)} candidates sent | run_id={run_id}")

    except Exception as exc:
        err_text = f"{type(exc).__name__}: {exc}\n\n{traceback.format_exc()}"
        print(f"[NEWSLETTER_JOB] CRITICAL ERROR run_id={run_id}:\n{err_text}")
        log.status = "error"
        log.error_message = err_text[:2000]
        db.commit()
        _send_alert(
            subject=f"Newsletter job failed — {date_str}",
            body=err_text,
        )
