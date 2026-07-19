#!/usr/bin/env python3
"""
Coiled Spring Playbook v1.6
FRESH BUILD  -  zero dependencies on prior versions.
Content verbatim from brief. Written clean, no patches.
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
import os

# ── COLORS ────────────────────────────────────────────────────────────────────
BG     = HexColor('#0D1117')
BG2    = HexColor('#161B22')
BG3    = HexColor('#21262D')
ORANGE = HexColor('#FF6B35')
BLUE   = HexColor('#58A6FF')
GREEN  = HexColor('#3FB950')
GREEN2 = HexColor('#00C853')
RED    = HexColor('#F85149')
YELLOW = HexColor('#E3B341')
TEXT   = HexColor('#E6EDF3')
TEXT2  = HexColor('#8B949E')
TEXT3  = HexColor('#7D8590')
BORDER = HexColor('#30363D')

# ── PAGE DIMENSIONS ───────────────────────────────────────────────────────────
W, H = A4           # 595.27 x 841.89 pt
MG   = 20 * mm      # 56.69 pt margins (20mm per brief)
CW   = W - 2 * MG  # 481.89 pt content width

IMGS = '/sessions/laughing-beautiful-planck/mnt/outputs/'
OUT  = '/sessions/laughing-beautiful-planck/mnt/coiled-spring-backend2/playbook-v1.6/export/CoiledSpring_Playbook_v1.6.pdf'

# ── CORE DRAWING HELPERS ──────────────────────────────────────────────────────
def fbg(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def np_(c):
    c.showPage()
    fbg(c)

def dt(c, t, x, y, f='Helvetica', s=11, col=None, a='left'):
    """Draw single text string at (x, y)."""
    if col is None:
        col = TEXT
    c.setFont(f, s)
    c.setFillColor(col)
    if   a == 'center': c.drawCentredString(x, y, t)
    elif a == 'right':  c.drawRightString(x, y, t)
    else:               c.drawString(x, y, t)

def wt(c, text, x, y, maxw, f='Helvetica', s=11, col=None, lh=16):
    """Word-wrap text. Returns height consumed."""
    if col is None:
        col = TEXT
    c.setFont(f, s)
    c.setFillColor(col)
    words = text.split()
    line = ''
    lines_out = []
    for word in words:
        test = (line + ' ' + word).strip()
        if c.stringWidth(test, f, s) <= maxw:
            line = test
        else:
            if line:
                lines_out.append(line)
            line = word
    if line:
        lines_out.append(line)
    for i, ln in enumerate(lines_out):
        c.drawString(x, y - i * lh, ln)
    return len(lines_out) * lh

def hl(c, x1, x2, y, col=None, lw=0.5):
    """Draw horizontal rule."""
    if col is None:
        col = BORDER
    c.setStrokeColor(col)
    c.setLineWidth(lw)
    c.line(x1, y, x2, y)

def dr(c, x, y, w, h, fill=None, stroke=None, sw=1.0, r=4):
    """Draw rounded rectangle."""
    if fill is None:
        fill = BG2
    if stroke is None:
        stroke = BORDER
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(sw)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)

def logo(c, cx, cy, r=22):
    """Draw CS logo circle."""
    c.setFillColor(ORANGE)
    c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', int(r * 0.85))
    c.drawCentredString(cx, cy - r * 0.28, 'CS')

def cs_badge(c, x, y, score):
    """Draw CS score badge (24x16 pill)."""
    s = int(score)
    col = GREEN2 if s >= 70 else (YELLOW if s >= 50 else RED)
    c.setFillColor(col)
    c.roundRect(x, y, 28, 15, 3, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(x + 14, y + 4, str(s))

# ── FOOTER ────────────────────────────────────────────────────────────────────
def ftr(c, n, tot=15):
    hl(c, MG, W - MG, 32, BORDER, 0.5)
    dt(c, 'The Coiled Spring Playbook', MG, 16, 'Helvetica', 8, TEXT3)
    dt(c, 'coiledspring.app', W / 2, 16, 'Helvetica', 8, ORANGE, 'center')
    dt(c, f'{n} / {tot}', W - MG, 16, 'Helvetica', 8, TEXT3, 'right')

# ── CHAPTER HEADER ────────────────────────────────────────────────────────────
def shdr(c, num, title, sub=''):
    """Standard chapter header. Returns y of content start."""
    c.setFillColor(ORANGE)
    c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2)
    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, num,   MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, title, MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    if sub:
        dt(c, sub, MG, H - 78, 'Helvetica', 10.5, TEXT2)
    hl(c, 0, W, H - 95, BORDER, 0.8)
    return H - 112

# ── MICRO-CTA STRIP (fixed: y=72 to y=114) ───────────────────────────────────
def mcta(c, action, url):
    by = 72
    bh = 42
    c.setFillColor(BG2)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(0.8)
    c.roundRect(MG, by, CW, bh, 4, fill=1, stroke=1)
    c.setFillColor(ORANGE)
    c.rect(MG, by + bh - 4, CW, 4, fill=1, stroke=0)
    dt(c, '>> TRY IT NOW:', MG + 12, by + bh - 14, 'Helvetica-Bold', 9, ORANGE)
    dt(c, action, MG + 106, by + bh - 14, 'Helvetica', 9, TEXT2)
    dt(c, url, MG + CW - 12, by + bh - 14, 'Helvetica-Bold', 9, ORANGE, 'right')
    dt(c, '14-day free trial  ·  No credit card needed', MG + 12, by + 10, 'Helvetica', 8, TEXT3)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1  -  COVER
# ══════════════════════════════════════════════════════════════════════════════
def p1_cover(c):
    fbg(c)
    # Orange top + bottom bars
    c.setFillColor(ORANGE)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    c.rect(0, 0, W, 6, fill=1, stroke=0)

    # FREE PDF badge  -  top LEFT per brief
    c.setFillColor(ORANGE)
    c.circle(MG + 26, H - 52, 26, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(MG + 26, H - 46, 'FREE')
    c.drawCentredString(MG + 26, H - 59, 'PDF')

    # CS logo + brand
    logo(c, W / 2, H - 140, 48)
    dt(c, 'COILED SPRING OPTIONS TERMINAL', W / 2, H - 200, 'Helvetica-Bold', 8.5, ORANGE, 'center')
    hl(c, MG + 30, W - MG - 30, H - 212, BORDER, 0.8)

    # Main title
    dt(c, 'The Coiled Spring', W / 2, H - 256, 'Helvetica-Bold', 34, TEXT, 'center')
    dt(c, 'Playbook',          W / 2, H - 296, 'Helvetica-Bold', 34, ORANGE, 'center')
    hl(c, MG + 30, W - MG - 30, H - 314, BORDER, 0.5)

    # Subtitles
    dt(c, 'How to Find Low-IV Options Before They Expand',
       W / 2, H - 336, 'Helvetica', 13, TEXT2, 'center')
    dt(c, ' -  And Trade Them Profitably',
       W / 2, H - 354, 'Helvetica-Oblique', 12, TEXT3, 'center')

    # 3 feature pills
    pills = [('SCANNER', ORANGE), ('VOL SURFACE', BLUE), ('PAYOFF ANALYSIS', GREEN)]
    pw = (CW - 16) / 3
    for i, (lb, col) in enumerate(pills):
        px = MG + i * (pw + 8)
        c.setFillColor(BG3)
        c.setStrokeColor(col)
        c.setLineWidth(0.8)
        c.roundRect(px, H - 394, pw, 24, 4, fill=1, stroke=1)
        dt(c, lb, px + pw / 2, H - 387, 'Helvetica-Bold', 8, col, 'center')

    # 3 metrics
    stats = [('1,100+', 'Tickers'), ('Daily', 'IV Snapshots'), ('15+', 'Countries')]
    sw = CW / 3
    for i, (v, lb) in enumerate(stats):
        sx = MG + i * sw + sw / 2
        dt(c, v,  sx, H - 430, 'Helvetica-Bold', 20, ORANGE, 'center')
        dt(c, lb, sx, H - 448, 'Helvetica',       9, TEXT3,  'center')
    hl(c, MG, W - MG, H - 460, BORDER, 0.5)

    # Body text (2 lines from brief)
    wt(c, 'Most options traders lose money because they overpay for volatility. This playbook teaches the quantitative framework behind the Coiled Spring strategy  -  how to systematically identify underpriced options in compressed-IV environments and build asymmetric positions before the release.',
       MG, H - 480, CW, 'Helvetica', 10, TEXT3, 15)

    # Footer author line
    hl(c, MG, W - MG, 112, BORDER, 0.5)
    logo(c, MG + 20, 82, 18)
    dt(c, 'Francesco Sgarbossa', MG + 46, 94, 'Helvetica-Bold', 11, TEXT)
    dt(c, 'Quant Options Trader  |  Builder of Coiled Spring', MG + 46, 79, 'Helvetica', 9, TEXT3)
    dt(c, 'coiledspring.app', W - MG, 82, 'Helvetica', 9, ORANGE, 'right')


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2  -  THE COILED SPRING METAPHOR
# ══════════════════════════════════════════════════════════════════════════════
def p2_metaphor(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 1', 'The Coiled Spring Metaphor',
             'When compressed volatility becomes your edge')
    y -= 14

    # Intro paragraph (verbatim from brief)
    wt(c, 'In mechanics, a coiled spring stores energy when compressed. The tighter the coil, the more explosive the release. Options work identically: when Implied Volatility falls to historic lows, the spring loads. When a catalyst arrives, it releases  -  and premium re-prices sharply.',
       MG, y, CW, 'Helvetica', 11, TEXT, 16)
    y -= 68

    # 4 step boxes with arrows
    steps = [
        ('1', 'IV COMPRESSES', GREEN, 'HV Rank < 30. Market is calm. Options are cheap. The spring is loading.'),
        ('2', 'PRICE COILS',   BLUE,  'Underlying consolidates. Volume drops. Energy builds in silence.'),
        ('3', 'CATALYST',      YELLOW,'Earnings, macro event, breakout. Maximum compression before release.'),
        ('4', 'IV EXPANDS',    ORANGE,'IV spikes. Long-premium positions profit from re-pricing  -  any direction.'),
    ]
    bw = (CW - 28) / 4    # box width
    bh = 120
    arrow_w = 10
    for i, (num, title, col, desc) in enumerate(steps):
        bx = MG + i * (bw + arrow_w + 2 + 2)
        # Box
        dr(c, bx, y - bh, bw, bh, BG2, col, 1.2, 6)
        # Number circle
        c.setFillColor(col)
        c.circle(bx + bw / 2, y - 16, 14, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(bx + bw / 2, y - 20, num)
        # Title
        dt(c, title, bx + bw / 2, y - 38, 'Helvetica-Bold', 9, col, 'center')
        # Description
        wt(c, desc, bx + 8, y - 54, bw - 16, 'Helvetica', 8.5, TEXT2, 13)
        # Arrow (except after last)
        if i < 3:
            ax = bx + bw + 2
            ay = y - bh / 2 + 5
            c.setFillColor(BG3)
            c.setStrokeColor(BORDER)
            c.setLineWidth(0.5)
            c.line(ax, ay, ax + arrow_w, ay)
            c.setFillColor(TEXT3)
            c.setFont('Helvetica-Bold', 12)
            c.drawString(ax + 1, ay - 4, '>')

    y -= bh + 18

    # Pull quote
    dr(c, MG, y - 68, CW, 64, BG3, BORDER, 0.5, 6)
    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 28)
    c.drawString(MG + 12, y - 18, '"')
    wt(c, 'The edge is not predicting direction  -  it is identifying when the market underprices uncertainty, then being positioned when it re-prices.',
       MG + 30, y - 16, CW - 44, 'Helvetica-Oblique', 10.5, TEXT, 15)
    dt(c, ' -  Francesco Sgarbossa', W - MG - 10, y - 58, 'Helvetica', 9, TEXT3, 'right')
    y -= 82

    # WHAT YOU WILL FIND box
    items = [
        'Identify HV Rank <30 setups in under 2 minutes',
        'Read the 3D Volatility Surface like a pro',
        'Build asymmetric LEAPS positions with defined risk',
        'Run the 7-point pre-trade checklist before every entry',
        'Model payoffs with the What-If Simulator before execution',
    ]
    bx2_h = len(items) * 22 + 36
    dr(c, MG, y - bx2_h, CW, bx2_h, BG3, ORANGE, 1.2, 6)
    dt(c, 'WHAT YOU WILL FIND IN THIS PLAYBOOK', MG + 12, y - 16, 'Helvetica-Bold', 9, ORANGE)
    for i, item in enumerate(items):
        iy = y - 36 - i * 22
        c.setFillColor(GREEN2)
        c.circle(MG + 22, iy + 4, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(MG + 22, iy + 1, 'v')
        dt(c, item, MG + 36, iy, 'Helvetica', 9.5, TEXT)
    dt(c, '>> Start at Chapter 4  -  The Scanner  >>  coiledspring.app/scanner',
       MG + 12, y - bx2_h + 12, 'Helvetica-Oblique', 9, ORANGE)

    mcta(c, 'Start scanning for compressed volatility setups', 'coiledspring.app')
    ftr(c, 2)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3  -  WHY RETAIL OPTIONS TRADERS LOSE
# ══════════════════════════════════════════════════════════════════════════════
def p3_lose(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 2', 'Why Retail Options Traders Lose',
             'The structural disadvantage  -  and how to flip it')
    y -= 12

    wt(c, 'Studies show 70-80% of retail options buyers lose money. This is structural, not bad luck: most traders buy options AFTER the move, when IV is already elevated  -  paying maximum premium at exactly the wrong time.',
       MG, y, CW, 'Helvetica', 11, TEXT, 16)
    y -= 54

    # 3 mistake boxes
    mistakes = [
        ('Buying at Peak IV',
         'Buy calls/puts AFTER a big move. IV already elevated. You pay max premium at the worst moment. Theta works against you from day one.',
         RED),
        ('Wrong DTE',
         'Short-dated options (< 30 DTE): theta destroys value every day. The clock runs against you. Long options need time to breathe.',
         RED),
        ('No Entry Criteria',
         'No IV filter, no quality score, no DTE rule. Speculation without a framework. Every trade becomes a guess.',
         RED),
    ]
    bw3 = (CW - 12) / 3
    bh3 = 90
    for i, (title, desc, col) in enumerate(mistakes):
        bx = MG + i * (bw3 + 6)
        dr(c, bx, y - bh3, bw3, bh3, BG2, col, 1.0, 4)
        c.setFillColor(col)
        c.rect(bx, y - 4, bw3, 4, fill=1, stroke=0)
        dt(c, title, bx + 10, y - 18, 'Helvetica-Bold', 10.5, col)
        wt(c, desc, bx + 10, y - 33, bw3 - 18, 'Helvetica', 9, TEXT2, 13)
    y -= bh3 + 14

    # THE COILED SPRING SOLUTION  -  bordered box (verbatim from brief)
    sol_h = 88
    dr(c, MG, y - sol_h, CW, sol_h, BG2, ORANGE, 1.2, 6)
    c.setFillColor(ORANGE)
    c.rect(MG, y - 3, CW, 3, fill=1, stroke=0)
    dt(c, 'THE COILED SPRING SOLUTION', MG + 14, y - 17, 'Helvetica-Bold', 11, ORANGE)
    hl(c, MG + 14, MG + CW - 14, y - 23, BORDER, 0.4)
    wt(c, 'Screen for stocks where IV Rank is below 30  -  historically cheap. Enter long-dated options (90-730 DTE) before the catalyst. Let IV mean reversion work as a structural tailwind  -  even if price barely moves, IV expansion profits the position.',
       MG + 14, y - 34, CW - 28, 'Helvetica', 10.5, TEXT, 15)
    y -= sol_h + 14

    # Comparison table
    tw = CW
    hdr_h = 22
    row_h = 22
    c.setFillColor(BG3)
    c.rect(MG, y - hdr_h, tw, hdr_h, fill=1, stroke=0)
    col_w = tw / 3
    for i, h in enumerate(['Dimension', 'Retail Approach', 'Coiled Spring']):
        dt(c, h, MG + i * col_w + 10, y - 15, 'Helvetica-Bold', 9, ORANGE)
    rows = [
        ('Entry Timing',    'After move  -  IV elevated', 'Before move  -  IV low'),
        ('IV Environment',  'IV Rank 70-100',           'IV Rank < 30'),
        ('DTE',             '7-30 days',                '90-730 days'),
        ('Edge Source',     'Direction guess',          'IV mean reversion'),
    ]
    for ri, (d, bad, good) in enumerate(rows):
        ry = y - hdr_h - (ri + 1) * row_h
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820'))
            c.rect(MG, ry, tw, row_h, fill=1, stroke=0)
        dt(c, d,    MG + 10,              ry + 7, 'Helvetica-Bold', 9, TEXT)
        dt(c, bad,  MG + col_w + 10,     ry + 7, 'Helvetica',      9, RED)
        dt(c, good, MG + 2 * col_w + 10, ry + 7, 'Helvetica',      9, GREEN2)
        hl(c, MG, MG + tw, ry, BORDER, 0.3)
    y -= hdr_h + len(rows) * row_h + 12

    # BY THE NUMBERS + 3 testimonials
    stats_h = 58
    testi_h = 3 * 22 + 14
    box_h = stats_h + testi_h
    dr(c, MG, y - box_h, CW, box_h, BG3, BORDER, 0.5, 6)
    dt(c, 'COILED SPRING TERMINAL  -  BY THE NUMBERS', MG + 12, y - 16, 'Helvetica-Bold', 9, ORANGE)
    stats_data = [('1,100+', 'tickers'), ('4,173+', 'IV pts/day'), ('100%', 'self-built'), ('15+', 'countries')]
    sw4 = (CW - 24) / 4
    for i, (v, lb) in enumerate(stats_data):
        sx = MG + 12 + i * sw4 + sw4 / 2
        dt(c, v,  sx, y - 36, 'Helvetica-Bold', 15, ORANGE, 'center')
        dt(c, lb, sx, y - 50, 'Helvetica',       8, TEXT3,  'center')
    hl(c, MG + 12, MG + CW - 12, y - stats_h, BORDER, 0.4)
    testi = [
        ('"Finally a scanner that gives me data, not signals."', ' -  Beta User, US'),
        ('"HV Rank + CS Score changed how I find options. No more guessing."', ' -  Beta User, UK'),
        ('"First LEAPS using the checklist. Clear, disciplined, profitable."', ' -  Beta User, CA'),
    ]
    for i, (quote, attr) in enumerate(testi):
        ty = y - stats_h - 18 - i * 22
        c.setFillColor(BG2)
        c.roundRect(MG + 10, ty - 15, CW - 20, 18, 3, fill=1, stroke=0)
        dt(c, quote, MG + 22, ty - 9, 'Helvetica-Oblique', 8.5, TEXT2)
        dt(c, attr,  W - MG - 14, ty - 9, 'Helvetica-Bold', 8, ORANGE, 'right')

    ftr(c, 3)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4  -  THE 3 PILLARS
# ══════════════════════════════════════════════════════════════════════════════
def p4_pillars(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 3', 'The 3 Pillars of the Strategy',
             'All three must align. No exceptions.')
    y -= 10

    pillars = [
        ('1', 'HV COMPRESSION', GREEN, 'HV Rank < 30',
         'HV Rank tells you where current 30-day realized volatility sits in its 52-week range. Below 30 means near historic lows  -  you are not competing with elevated premium.',
         'Target: < 15 for exceptional compression.',
         ['HV 30D% at multi-month low', 'HV Rank < 30 (target: < 15)', 'HV PCT in lowest quartile', '52W range confirms compression']),
        ('2', 'QUALITY SCORE', ORANGE, 'CS Score >= 70',
         'The Coiled Spring Score (0-100) synthesizes IV/HV compression, liquidity, bid-ask quality, open interest, delta and time structure into one number. Score >= 70 = all factors aligned.',
         'Target: 75+ for high-conviction entries.',
         ['CS Score >= 70 (target: 75+)', 'IV/HV ratio < 1.2', 'Open Interest > 500 contracts', 'Bid-Ask Spread% < 5%']),
        ('3', 'TIME EDGE', BLUE, '90 <= DTE <= 730',
         'Long-dated options give the thesis time to develop and minimize daily theta impact. With 300+ DTE remaining, you can be wrong on timing and still profit when IV expansion arrives.',
         'Minimum: 90 days | Preferred: 180-400 days',
         ['DTE >= 90 days minimum', 'DTE >= 180 days preferred', 'Expiry beyond catalyst + 60d', 'Review and roll at 60 DTE']),
    ]
    ph = 156
    gap = 10
    for i, (num, title, col, badge, body, target, bullets) in enumerate(pillars):
        py = y - i * (ph + gap)
        dr(c, MG, py - ph, CW, ph, BG2, col, 1.0, 6)
        # Number circle
        c.setFillColor(col)
        c.circle(MG + 28, py - 28, 18, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('Helvetica-Bold', 14)
        c.drawCentredString(MG + 28, py - 33, num)
        # Title — then badge to its right
        dt(c, title, MG + 56, py - 18, 'Helvetica-Bold', 14, col)
        title_w = c.stringWidth(title, 'Helvetica-Bold', 14)
        badge_w = c.stringWidth(badge, 'Helvetica-Bold', 9) + 14
        bx = MG + 56 + title_w + 12
        c.setFillColor(HexColor('#1a2030'))
        c.setStrokeColor(col)
        c.setLineWidth(0.8)
        c.roundRect(bx, py - 26, badge_w, 14, 3, fill=1, stroke=1)
        dt(c, badge, bx + 7, py - 20, 'Helvetica-Bold', 9, col)
        # Body text (left col: 58%)
        lw2 = CW * 0.56
        wt(c, body, MG + 12, py - 48, lw2, 'Helvetica', 9.5, TEXT2, 14)
        dt(c, target, MG + 12, py - ph + 12, 'Helvetica-Oblique', 9, col)
        # Bullet points (right col: 38%)
        rx = MG + lw2 + 20
        rw2 = CW - lw2 - 24
        for j, b in enumerate(bullets):
            by2 = py - 48 - j * 18
            c.setFillColor(col)
            c.circle(rx + 5, by2 + 4, 3, fill=1, stroke=0)
            dt(c, b, rx + 14, by2, 'Helvetica', 8.5, TEXT2)

    # Summary box
    sum_y = y - 3 * (ph + gap) - 6
    dr(c, MG, sum_y - 40, CW, 36, BG3, ORANGE, 0.8, 4)
    dt(c, 'All 3 pillars must align for a valid entry.  One alone is never sufficient.',
       MG + 14, sum_y - 14, 'Helvetica-Bold', 10, ORANGE)
    wt(c, 'The edge comes from convergence: compressed HV + high CS Score + adequate DTE = maximum probability setup.',
       MG + 14, sum_y - 28, CW - 28, 'Helvetica', 9, TEXT2, 13)

    ftr(c, 4)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 5  -  THE SCANNER (full table, 12 rows x 8 cols)
# ══════════════════════════════════════════════════════════════════════════════
SCAN_DATA = [
    ('QQQ','PUT','620','2027-06-17','336','$31.23','30.6%','72'),
    ('QQQ','PUT','625','2027-06-17','336','$30.72','29.6%','72'),
    ('QQQ','PUT','630','2027-06-17','336','$32.16','29.5%','72'),
    ('QQQ','PUT','635','2027-06-17','336','$34.13','29.7%','71'),
    ('QQQ','PUT','640','2027-06-17','336','$35.10','29.4%','71'),
    ('QQQ','PUT','645','2027-06-17','336','$37.39','29.6%','71'),
    ('QQQ','PUT','650','2027-06-17','336','$38.90','29.8%','71'),
    ('QQQ','PUT','655','2027-06-17','336','$40.12','30.1%','70'),
    ('QQQ','PUT','660','2027-06-17','336','$41.88','30.2%','70'),
    ('QQQ','PUT','665','2027-06-17','336','$43.50','30.0%','70'),
    ('QQQ','PUT','670','2027-06-17','336','$44.88','30.4%','69'),
    ('QQQ','PUT','675','2027-06-17','336','$46.50','30.3%','69'),
]
SCAN_COLS = [('TICKER',52),('TYPE',36),('STRIKE',46),('EXPIRATION',78),
             ('DTE',34),('MID',50),('IV',50),('CS SCORE',44)]

def draw_scanner_table(c, x, y, w, rows):
    tot = sum(cw for _, cw in SCAN_COLS)
    cws = [(n, cw / tot * w) for n, cw in SCAN_COLS]
    hh = 22; rh = 20
    c.setFillColor(BG3)
    c.rect(x, y - hh, w, hh, fill=1, stroke=0)
    xi = x + 6
    for n, cw in cws:
        dt(c, n, xi, y - 16, 'Helvetica-Bold', 8, ORANGE)
        xi += cw
    for ri, row in enumerate(rows):
        ry = y - hh - ri * rh
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820'))
            c.rect(x, ry, w, rh, fill=1, stroke=0)
        xi = x + 6
        for ci, (val, (n, cw)) in enumerate(zip(row, cws)):
            if ci == 0:
                dt(c, val, xi, ry + 6, 'Helvetica-Bold', 9, ORANGE)
            elif ci == 1:
                dt(c, val, xi, ry + 6, 'Helvetica-Bold', 9, RED if val == 'PUT' else BLUE)
            elif ci == 6:
                dt(c, val, xi, ry + 6, 'Helvetica', 9, BLUE)
            elif ci == 7:
                s = int(val)
                col = GREEN2 if s >= 70 else (YELLOW if s >= 50 else RED)
                c.setFillColor(col)
                c.roundRect(xi, ry + 3, 30, 14, 3, fill=1, stroke=0)
                c.setFillColor(white)
                c.setFont('Helvetica-Bold', 9)
                c.drawString(xi + 4, ry + 5, val)
            else:
                dt(c, val, xi, ry + 6, 'Helvetica', 9, TEXT2)
            xi += cw
        hl(c, x, x + w, ry, BORDER, 0.25)
    return hh + len(rows) * rh

def p5_scanner(c):
    fbg(c)
    # Custom header (scanner subtitle has pipe-separated info)
    c.setFillColor(ORANGE)
    c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2)
    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'CHAPTER 4', MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'The Scanner', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'QQQ  |  Last $705.94  |  221 contracts found  |  Filter: PUT, DTE 300-750',
       MG, H - 78, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H - 95, BORDER, 0.8)

    # Filter bar
    fby = H - 130; fbh = 28
    dr(c, MG, fby, CW, fbh, BG2, BORDER, 0.5)
    dt(c, 'TICKER:', MG + 8, fby + fbh - 9, 'Helvetica', 8, TEXT3)
    c.setFillColor(BG3)
    c.roundRect(MG + 52, fby + 6, 78, 14, 3, fill=1, stroke=0)
    dt(c, 'QQQ  x', MG + 57, fby + 11, 'Helvetica', 8, ORANGE)
    for lb, fx in [('TYPE: PUT', MG + 148), ('DTE MIN: 300', MG + 230), ('DTE MAX: 750', MG + 320)]:
        c.setFillColor(BG3)
        c.roundRect(fx, fby + 6, c.stringWidth(lb, 'Helvetica', 8) + 12, 14, 3, fill=1, stroke=0)
        dt(c, lb, fx + 6, fby + 11, 'Helvetica', 8, TEXT2)
    c.setFillColor(ORANGE)
    c.roundRect(MG + CW - 52, fby + 7, 44, 13, 3, fill=1, stroke=0)
    dt(c, 'RUN SCANNER', MG + CW - 50, fby + 11, 'Helvetica-Bold', 7, white)

    # Scanner table frame
    ty = H - 168
    table_bottom = 100
    table_h = ty - table_bottom
    dr(c, MG, table_bottom, CW, table_h, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3)
    c.roundRect(MG, ty - 24, CW, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty - 10, CW, 10, fill=1, stroke=0)
    dt(c, 'SCANNER RESULTS  -  SORTED BY CS SCORE  (8 core columns shown)',
       MG + 10, ty - 17, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG + CW, ty - 24, BORDER, 0.5)
    draw_scanner_table(c, MG + 4, ty - 24, CW - 8, SCAN_DATA)

    # Legend
    hl(c, MG, W - MG, table_bottom + 22, BORDER, 0.4)
    dt(c, 'CS SCORE:  >= 70 GREEN  |  50-69 YELLOW  |  < 50 RED',
       MG + 8, table_bottom + 10, 'Helvetica', 8, TEXT3)
    dt(c, 'Click any row to open Opportunity Analysis + Vol Surface',
       W - MG - 8, table_bottom + 10, 'Helvetica', 8, ORANGE, 'right')

    ftr(c, 5)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 6  -  READING A SCANNER ROW (5 annotation sections: 2x2 + full-width)
# ══════════════════════════════════════════════════════════════════════════════
def p6_row(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 4 (cont.)', 'Reading a Scanner Row',
             'Example: QQQ PUT 620   -   CS Score 72')
    y -= 10

    wt(c, 'Each row in the scanner tells a complete story. Here is how to decode the most important columns from a single result.',
       MG, y, CW, 'Helvetica', 11, TEXT, 16)
    y -= 38

    # Zoomed row  -  header
    zoom_cols = [('TICKER','QQQ',ORANGE,52),('TYPE','PUT',RED,36),
                 ('STRIKE','620',TEXT,46),('EXPIRATION','2027-06-17',TEXT2,78),
                 ('DTE','336',GREEN2,34),('MID','$31.23',GREEN,50),
                 ('IV','30.6%',BLUE,50),('CS SCORE','72',None,44)]
    tot_z = sum(cw for _,_,_,cw in zoom_cols)
    cws_z = [(n, v, col, cw / tot_z * CW) for n, v, col, cw in zoom_cols]
    # Header row
    c.setFillColor(BG3)
    c.rect(MG, y - 22, CW, 22, fill=1, stroke=0)
    xi = MG + 6
    for n, v, col, cw in cws_z:
        dt(c, n, xi, y - 16, 'Helvetica-Bold', 8, ORANGE)
        xi += cw
    # Data row (highlighted)
    rh2 = 36
    c.setFillColor(HexColor('#141820'))
    c.rect(MG, y - 22 - rh2, CW, rh2, fill=1, stroke=0)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(2)
    c.rect(MG, y - 22 - rh2, CW, rh2, fill=0, stroke=1)
    xi = MG + 6
    for n, val, col, cw in cws_z:
        if val == '72':
            c.setFillColor(GREEN2)
            c.roundRect(xi, y - 22 - rh2 + 9, 28, 18, 3, fill=1, stroke=0)
            dt(c, val, xi + 4, y - 22 - rh2 + 13, 'Helvetica-Bold', 13, white)
        else:
            dt(c, val, xi, y - 22 - rh2 + 12, 'Helvetica-Bold', 12, col or TEXT)
        xi += cw
    y -= 22 + rh2 + 18

    # 2x2 grid  -  4 annotation boxes
    ann4 = [
        ('QQQ  (Ticker)',
         'Blue-chip ETF. 50M+ daily volume. Tightest bid-ask spreads. Ideal learning vehicle.'),
        ('PUT 620  (Strike)',
         'Long PUT profits from price decline OR IV expansion. Strike 12% OTM  -  core Coiled Spring entry.'),
        ('336  (DTE)',
         '11 months out. Theta ~$0.03/day. Far enough for thesis to develop. No daily monitoring.'),
        ('30.6%  (IV)',
         'Near HV 30D (~21%). IV/HV ratio 1.45. Mild compression. Not overpaying for premium.'),
    ]
    aw = (CW - 8) / 2
    bh4 = 76
    row_gap = 84
    for i, (lb, desc) in enumerate(ann4):
        ri = i // 2
        ci = i % 2
        ax = MG + ci * (aw + 8)
        ay = y - ri * row_gap
        dr(c, ax, ay - bh4, aw, bh4, BG2, BORDER)
        c.setFillColor(ORANGE)
        c.rect(ax, ay - 3, aw, 3, fill=1, stroke=0)
        dt(c, lb,   ax + 10, ay - 17, 'Helvetica-Bold', 10, TEXT)
        wt(c, desc, ax + 10, ay - 31, aw - 18, 'Helvetica', 9, TEXT2, 13)
    y -= 2 * row_gap + 12

    # Full-width CS Score box  -  GREEN emphasis (verbatim from brief)
    cs_h = 62
    dr(c, MG, y - cs_h, CW, cs_h, HexColor('#0D2010'), GREEN, 1.5, 6)
    c.setFillColor(GREEN)
    c.rect(MG, y - 3, CW, 3, fill=1, stroke=0)
    # Large score badge
    c.setFillColor(GREEN)
    c.roundRect(MG + 10, y - cs_h + 8, 46, 46, 6, fill=1, stroke=0)
    dt(c, '72', MG + 33, y - cs_h + 28, 'Helvetica-Bold', 20, white, 'center')
    dt(c, 'CS', MG + 33, y - cs_h + 14, 'Helvetica-Bold', 8,  white, 'center')
    # Label + description
    dt(c, '72  CS Score   -   GREEN', MG + 68, y - 14, 'Helvetica-Bold', 11, GREEN)
    hl(c, MG + 68, W - MG - 10, y - 21, HexColor('#1A4020'), 0.5)
    wt(c, 'All three pillars confirmed: HV compressed, quality high, DTE adequate. Valid entry.',
       MG + 68, y - 33, CW - 82, 'Helvetica-Bold', 9.5, TEXT, 14)
    # VALID ENTRY badge
    c.setFillColor(GREEN)
    c.roundRect(W - MG - 82, y - cs_h + 12, 72, 18, 4, fill=1, stroke=0)
    dt(c, 'VALID ENTRY', W - MG - 46, y - cs_h + 18, 'Helvetica-Bold', 8, white, 'center')

    mcta(c, 'Open the Scanner and click any row to decode it live', 'coiledspring.app/scanner')
    ftr(c, 6)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 7  -  HV SCREENER
# ══════════════════════════════════════════════════════════════════════════════
HV_DATA = [
    ('NIO',  'NIO Inc.',                 '40.3%','0.0', '0.0%', '89.4%','40.3%'),
    ('MGM',  'MGM Resorts Int.',          '23.1%','0.0', '0.0%', '58.1%','23.1%'),
    ('BBAI', 'BigBear.ai Holdings',       '57.5%','0.2', '0.5%','117.5%','57.4%'),
    ('TMHC', 'Taylor Morrison Home',      '2.9%', '0.3', '0.5%', '66.6%', '2.7%'),
    ('SNPS', 'Synopsys Inc.',             '29.5%','0.5', '0.5%','146.9%','28.9%'),
    ('CZR',  'Caesars Entertainment',     '12.8%','0.6', '2.3%', '85.1%','12.4%'),
    ('AES',  'AES Corporation',           '4.0%', '1.0', '2.7%', '70.5%', '3.4%'),
    ('JHG',  'Janus Henderson Group',     '1.8%', '1.0', '8.5%', '45.0%', '1.3%'),
    ('WST',  'West Pharma Services',      '21.8%','1.2', '0.9%', '69.6%','21.2%'),
    ('RAMP', 'LiveRamp Holdings',         '5.6%', '1.2', '4.5%', '78.7%', '4.7%'),
    ('PCRX', 'Pacira BioSciences',        '22.3%','1.5', '1.8%', '58.3%','21.8%'),
    ('HCSG', 'Healthcare Services Grp',   '26.3%','2.0', '1.8%', '62.2%','25.6%'),
    ('LVS',  'Las Vegas Sands',           '20.8%','2.3', '6.3%', '56.0%','20.0%'),
    ('HUM',  'Humana Inc.',               '34.8%','3.1', '1.4%', '81.3%','33.5%'),
]
HV_COLS = [('TICKER',44),('COMPANY',148),('HV 30D%',60),('HV RANK',58),
           ('HV PCT',50),('52W MAX',60),('52W MIN',58)]

def draw_hv_table(c, x, y, w, rows):
    tot = sum(cw for _, cw in HV_COLS)
    cws = [(n, cw / tot * w) for n, cw in HV_COLS]
    hh = 22; rh = 20
    c.setFillColor(BG3)
    c.rect(x, y - hh, w, hh, fill=1, stroke=0)
    xi = x + 6
    for n, cw in cws:
        dt(c, n, xi, y - 16, 'Helvetica-Bold', 8, ORANGE)
        xi += cw
    for ri, row in enumerate(rows):
        ry = y - hh - ri * rh
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820'))
            c.rect(x, ry, w, rh, fill=1, stroke=0)
        xi = x + 6
        for ci, (val, (n, cw)) in enumerate(zip(row, cws)):
            if ci == 0:
                dt(c, val, xi, ry + 6, 'Helvetica-Bold', 9, ORANGE)
            elif ci == 1:
                dt(c, val[:26], xi, ry + 6, 'Helvetica', 8, TEXT2)
            elif ci == 3:
                rank = float(val)
                col = GREEN2 if rank < 30 else (YELLOW if rank < 80 else RED)
                c.setFillColor(col)
                c.roundRect(xi, ry + 4, 30, 14, 2, fill=1, stroke=0)
                c.setFillColor(white)
                c.setFont('Helvetica-Bold', 8)
                c.drawString(xi + 4, ry + 6, val)
            elif ci == 4:
                dt(c, val, xi, ry + 6, 'Helvetica', 8, GREEN2)
            elif ci == 5:
                dt(c, val, xi, ry + 6, 'Helvetica', 8, RED)
            else:
                dt(c, val, xi, ry + 6, 'Helvetica', 8, TEXT2)
            xi += cw
        hl(c, x, x + w, ry, BORDER, 0.25)

def p7_hv(c):
    fbg(c)
    c.setFillColor(ORANGE); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2);    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'CHAPTER 5', MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'HV Screener', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    dt(c, '1,019 tickers  |  Updated 16/07/2026 19:00  |  Sorted by HV Rank ASC',
       MG, H - 78, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H - 95, BORDER, 0.8)

    # Filter bar
    fby = H - 132; fbh = 28
    dr(c, MG, fby, CW, fbh, BG2, BORDER, 0.5)
    dt(c, 'TICKER:', MG + 8, fby + fbh - 9, 'Helvetica', 8, TEXT3)
    c.setFillColor(BG3); c.roundRect(MG + 52, fby + 6, 78, 14, 3, fill=1, stroke=0)
    dt(c, 'Filter...', MG + 57, fby + 11, 'Helvetica', 8, TEXT3)
    # Range labels
    for lb, fx in [('HV30% range', MG + 148), ('HV RANK range', MG + 258), ('HV PCT range', MG + 378)]:
        dt(c, lb, fx, fby + fbh - 9, 'Helvetica', 7.5, TEXT3)
    # Color chips
    for lbl, col, cx in [('<30 LOW', GREEN2, W - MG - 222), ('30-79 MED', YELLOW, W - MG - 162), ('>=80 HIGH', RED, W - MG - 98)]:
        tw2 = c.stringWidth(lbl, 'Helvetica-Bold', 7) + 10
        c.setFillColor(col); c.roundRect(cx, fby + 7, tw2, 13, 3, fill=1, stroke=0)
        dt(c, lbl, cx + 5, fby + 12, 'Helvetica-Bold', 7, white)
    c.setFillColor(ORANGE); c.roundRect(W - MG - 52, fby + 7, 44, 13, 3, fill=1, stroke=0)
    dt(c, 'REFRESH', W - MG - 46, fby + 12, 'Helvetica-Bold', 7, white)

    # Table frame
    ty = H - 170
    table_bot = 120
    dr(c, MG, table_bot, CW, ty - table_bot, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3); c.roundRect(MG, ty - 24, CW, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty - 10, CW, 10, fill=1, stroke=0)
    dt(c, 'HV SCREENER  -  Historical Volatility  -  1,019 tickers monitored',
       MG + 10, ty - 17, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG + CW, ty - 24, BORDER, 0.5)
    draw_hv_table(c, MG + 4, ty - 24, CW - 8, HV_DATA)

    hl(c, MG, W - MG, table_bot + 22, BORDER, 0.4)
    dt(c, 'HV Rank < 30 = compressed volatility = potential Coiled Spring setup. Sort ASC to surface best opportunities.',
       MG + 8, table_bot + 10, 'Helvetica', 8, TEXT3)

    mcta(c, 'Find tickers with HV Rank < 30  -  sort ascending', 'coiledspring.app/hv-screener')
    ftr(c, 7)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 8  -  READING THE VOLATILITY SURFACE
# ══════════════════════════════════════════════════════════════════════════════
def p8_vol_surface(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 6', 'Reading the Volatility Surface',
             'The most powerful single diagnostic in the terminal')
    y -= 10

    wt(c, 'The Vol Surface renders Implied Volatility for every listed option across all strikes and all expirations simultaneously as an interactive 3D map. It is the fastest way to identify where the market is pricing fear  -  and where it is not.',
       MG, y, CW, 'Helvetica', 11, TEXT, 16)
    y -= 54

    dt(c, 'What to Look For', MG, y, 'Helvetica-Bold', 14, TEXT)
    y -= 22

    # 4 pattern boxes (2x2 grid)  -  content verbatim from brief
    patterns = [
        ('Flat Blue Surface',
         'Ideal Coiled Spring entry. Low IV across all strikes and maturities. Any catalyst lifts the entire surface. Long options anywhere benefit.',
         BLUE),
        ('Front-Month Spike',
         'Short-dated IV elevated around earnings or macro event. Enter beyond the event if longer maturities are still blue. Buy the calm, not the storm.',
         YELLOW),
        ('Put Skew Spike',
         'Far OTM puts more expensive  -  tail-risk demand. Normal for index ETFs. Account for it in strike selection. Do not fight it.',
         RED),
        ('Interactive Cursor',
         'Click any surface point: exact strike, expiry, IV%, mid, delta, OI. Add to watchlist from the chart.',
         GREEN2),
    ]
    pw2 = (CW - 8) / 2
    ph2 = 88
    gap2 = 8
    for i, (title, desc, col) in enumerate(patterns):
        ri = i // 2; ci = i % 2
        px = MG + ci * (pw2 + gap2)
        py = y - ri * (ph2 + gap2)
        dr(c, px, py - ph2, pw2, ph2, BG2, col, 0.8, 4)
        c.setFillColor(col); c.rect(px, py - 3, pw2, 3, fill=1, stroke=0)
        dt(c, title, px + 10, py - 16, 'Helvetica-Bold', 10.5, col)
        wt(c, desc, px + 10, py - 30, pw2 - 18, 'Helvetica', 9, TEXT2, 13)
    y -= 2 * (ph2 + gap2) + 14

    # AXIS REFERENCE section
    dt(c, 'Axis Reference', MG, y, 'Helvetica-Bold', 13, TEXT)
    y -= 20

    axes = [
        ('X Axis  -  Strike',
         'All strike prices from far OTM left to far OTM right. Center is ATM. OTM puts left, OTM calls right.',
         ORANGE),
        ('Y Axis  -  Expiration',
         'All expiry dates from front-month (near) to LEAPS (far). Front-month slice is closest to you in 3D view.',
         BLUE),
        ('Z Axis  -  IV %',
         'Implied Volatility height. Blue = low IV (< 25%). Red = elevated (> 50%). Coiled Spring zone = blue to cyan.',
         GREEN),
    ]
    aw2 = (CW - 12) / 3
    ah2 = 72
    for i, (title, desc, col) in enumerate(axes):
        ax = MG + i * (aw2 + 6)
        dr(c, ax, y - ah2, aw2, ah2, BG2, col, 0.8, 4)
        c.setFillColor(col); c.rect(ax, y - 3, aw2, 3, fill=1, stroke=0)
        dt(c, title, ax + 8, y - 16, 'Helvetica-Bold', 9, col)
        wt(c, desc, ax + 8, y - 30, aw2 - 14, 'Helvetica', 8.5, TEXT2, 13)

    mcta(c, 'Rotate, zoom, click any point on the live vol surface', 'coiledspring.app/scanner')
    ftr(c, 8)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 9  -  QQQ VOLATILITY SURFACE (full screenshot)
# ══════════════════════════════════════════════════════════════════════════════
def p9_qqq_surface(c):
    fbg(c)
    c.setFillColor(ORANGE); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2);    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'CHAPTER 6 (cont.)', MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'QQQ Volatility Surface', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Current: $705.94  |  4,173 data points  |  Cubic Spline',
       MG, H - 78, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H - 95, BORDER, 0.8)

    # Full-page image
    img_h = H - 200
    dr(c, MG, 52, CW, img_h, BG2, BORDER, 0.8, 4)
    c.drawImage(IMGS + 'vol_surface.png', MG + 4, 56, width=CW - 8, height=img_h - 8,
                preserveAspectRatio=True, anchor='c')

    # Legend — two separate lines to avoid overlap
    hl(c, MG, W - MG, 54, BORDER, 0.4)
    dt(c, 'BLUE = low IV (Coiled Spring zone)  |  RED = elevated IV (expensive premium)',
       MG, 42, 'Helvetica', 8, TEXT3)
    dt(c, 'Interact: Rotate, Zoom, Hover  >>  coiledspring.app',
       MG, 28, 'Helvetica', 8, ORANGE)

    ftr(c, 9)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 10  -  PORTFOLIO TRACKER
# ══════════════════════════════════════════════════════════════════════════════
PORT_ROWS = [
    ('QQQ','PUT', '750','Jun 2028','700','LONG','1','$99.50','$98.08','27.9%','-$142','-1.43%','74'),
    ('QQQ','CALL','815','Jun 2027','335','LONG','1','$45.99','$36.38','23.9%','-$961','-20.9%','59'),
]
PORT_COLS = [('TICKER',46),('TYPE',32),('STRIKE',38),('EXPIRY',56),('DTE',32),
             ('DIR.',28),('QTY',22),('ENTRY',46),('LAST',42),('IV',36),
             ('PNL $',50),('PNL %',44),('CS',30)]

def p10_portfolio(c):
    fbg(c)
    c.setFillColor(ORANGE); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2);    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'CHAPTER 7', MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'Portfolio Tracker', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Monitor every position in real time', MG, H - 78, 'Helvetica', 10.5, TEXT2)
    hl(c, 0, W, H - 95, BORDER, 0.8)

    # Intro text (verbatim from brief)
    y = H - 112
    wt(c, 'Live view: CS Spread Strategy', MG, y, CW, 'Helvetica-Bold', 11, ORANGE, 16)
    y -= 18
    positions = [
        'QQQ PUT 750  |  Jun 2028  |  CS 74  |  On thesis >> Hold',
        'QQQ CALL 815  |  Jun 2027  |  CS 59  |  Monitor at 300 DTE',
    ]
    for pos in positions:
        c.setFillColor(ORANGE); c.circle(MG + 8, y + 3, 3, fill=1, stroke=0)
        dt(c, pos, MG + 18, y, 'Helvetica', 10, TEXT2)
        y -= 16
    y -= 4
    wt(c, 'P&L, Greeks, CS Score, and one-click What-If  -  all in one view.',
       MG, y, CW, 'Helvetica', 10, TEXT3, 14)
    y -= 20

    # Stats bar
    stats = [('2','Open Positions',TEXT),('-$1,103','Unrealized P&L',RED),
             ('74 / 59','CS Scores',ORANGE),('Real-time','P&L Updates',GREEN2)]
    sw = CW / 4
    for i, (v, lb, col) in enumerate(stats):
        sx = MG + i * sw
        dr(c, sx + 3, y - 36, sw - 6, 33, BG2, BORDER)
        dt(c, v,  sx + sw / 2, y - 13, 'Helvetica-Bold', 15, col, 'center')
        dt(c, lb, sx + sw / 2, y - 28, 'Helvetica', 7.5, TEXT3, 'center')
    y -= 48

    # Portfolio table
    ty = y
    table_bot = 300
    dr(c, MG, table_bot, CW, ty - table_bot, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3); c.roundRect(MG, ty - 24, CW, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty - 10, CW, 10, fill=1, stroke=0)
    dt(c, 'PORTFOLIO  -  CS SPREAD STRATEGY  |  POSITIONS', MG + 10, ty - 17, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG + CW, ty - 24, BORDER, 0.5)
    tot_p = sum(cw for _, cw in PORT_COLS)
    cws_p = [(n, cw / tot_p * CW) for n, cw in PORT_COLS]
    c.setFillColor(BG3); c.rect(MG + 4, ty - 24 - 22, CW - 8, 22, fill=1, stroke=0)
    xi = MG + 8
    for n, cw in cws_p:
        dt(c, n, xi, ty - 24 - 16, 'Helvetica-Bold', 7.5, ORANGE)
        xi += cw
    for ri, row in enumerate(PORT_ROWS):
        rh_p = 22; ry = ty - 24 - 22 - (ri + 1) * rh_p
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820')); c.rect(MG + 4, ry, CW - 8, rh_p, fill=1, stroke=0)
        xi = MG + 8
        for ci, (val, (n, cw)) in enumerate(zip(row, cws_p)):
            if   ci == 0:  dt(c, val, xi, ry + 7, 'Helvetica-Bold', 8, ORANGE)
            elif ci == 1:  dt(c, val, xi, ry + 7, 'Helvetica-Bold', 8, RED if val == 'PUT' else BLUE)
            elif ci == 5:  dt(c, val, xi, ry + 7, 'Helvetica-Bold', 8, GREEN)
            elif ci == 10: dt(c, val, xi, ry + 7, 'Helvetica', 8, RED)
            elif ci == 11: dt(c, val, xi, ry + 7, 'Helvetica', 8, RED)
            elif ci == 12:
                s = int(val); col = GREEN2 if s >= 70 else (YELLOW if s >= 50 else RED)
                c.setFillColor(col); c.roundRect(xi, ry + 5, 24, 14, 3, fill=1, stroke=0)
                c.setFillColor(white); c.setFont('Helvetica-Bold', 8); c.drawString(xi + 4, ry + 7, val)
            else:          dt(c, val, xi, ry + 7, 'Helvetica', 8, TEXT2)
            xi += cw
        hl(c, MG + 4, MG + CW - 4, ry, BORDER, 0.3)

    # Action note below table
    note_y = ty - 24 - 22 - 2 * 22 - 14
    dr(c, MG, note_y - 32, CW, 28, BG3, BORDER, 0.3, 4)
    dt(c, 'PUT 750: CS 74 - On thesis. Hold.  |  CALL 815: CS 59 - Monitor at 300 DTE.',
       MG + 12, note_y - 12, 'Helvetica', 9, TEXT2)
    dt(c, '>> Open in What-If tab for P&L scenarios',
       MG + 12, note_y - 26, 'Helvetica-Bold', 9, ORANGE)

    mcta(c, 'Track live P&L, Greeks and CS Score per position', 'coiledspring.app/portfolio')
    ftr(c, 10)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 11  -  WHAT-IF SIMULATOR (TWO separate caption boxes, verbatim from brief)
# ══════════════════════════════════════════════════════════════════════════════
def p11_whatif(c):
    fbg(c)
    c.setFillColor(ORANGE); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2);    c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'CHAPTER 8', MG, H - 28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'What-If Simulator', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Model P&L before you execute', MG, H - 78, 'Helvetica', 10.5, TEXT2)
    hl(c, 0, W, H - 95, BORDER, 0.8)

    # Layout from bottom up:
    # micro_cta:  y=72-114
    # BOX 2 (IV SHIFT SLIDER):  y=122-170
    # BOX 1 (WHAT THE CURVES SHOW):  y=178-246
    # chart:  y=254 to H-112

    # BOX 1  -  WHAT THE CURVES SHOW
    b1_bot = 178; b1_h = 68; b1_top = b1_bot + b1_h
    dr(c, MG, b1_bot, CW, b1_h, BG2, BORDER, 0.5, 4)
    dt(c, 'WHAT THE CURVES SHOW', MG + 14, b1_top - 13, 'Helvetica-Bold', 9, ORANGE)
    hl(c, MG + 14, MG + CW - 14, b1_top - 20, BORDER, 0.4)
    half = (CW - 28) / 2
    # Left column: U-shape, Center trough
    left_items = [
        ('U-shape:',       'long premium  -  both up and down moves profit'),
        ('Center trough:', 'theta decay zone  -  flat price loses value'),
    ]
    # Right column: Curves fan down, DTE choice
    right_items = [
        ('Curves fan down:', 'time erosion over 600 days of DTE'),
        ('Choose wisely:',   'DTE is your edge  -  longer = more time for thesis'),
    ]
    for i, (k, v) in enumerate(left_items):
        by2 = b1_top - 30 - i * 18
        dt(c, k, MG + 14, by2, 'Helvetica-Bold', 8.5, ORANGE)
        kw = c.stringWidth(k, 'Helvetica-Bold', 8.5)
        dt(c, v, MG + 16 + kw, by2, 'Helvetica', 8.5, TEXT2)
    for i, (k, v) in enumerate(right_items):
        by2 = b1_top - 30 - i * 18
        dt(c, k, MG + 14 + half + 4, by2, 'Helvetica-Bold', 8.5, ORANGE)
        kw = c.stringWidth(k, 'Helvetica-Bold', 8.5)
        dt(c, v, MG + 16 + half + 4 + kw, by2, 'Helvetica', 8.5, TEXT2)

    # BOX 2  -  IV SHIFT SLIDER (separate, BLUE border per brief)
    b2_bot = 120; b2_h = 50; b2_top = b2_bot + b2_h
    dr(c, MG, b2_bot, CW, b2_h, BG2, BLUE, 0.8, 4)
    dt(c, 'IV SHIFT SLIDER', MG + 14, b2_top - 13, 'Helvetica-Bold', 9, BLUE)
    hl(c, MG + 14, MG + CW - 14, b2_top - 20, BORDER, 0.4)
    dt(c, 'Stress-test vol collapse (-50%) or spike (+50%) before committing capital.',
       MG + 14, b2_top - 32, 'Helvetica', 8.5, TEXT2)
    dt(c, 'Drag the slider  -  all P&L curves reprice instantly.',
       MG + 14, b2_top - 46, 'Helvetica', 8.5, TEXT2)

    # CHART (fills from y=254 to H-112)
    chart_bot = 254; chart_top = H - 112
    ih = chart_top - chart_bot
    dr(c, MG, chart_bot, CW, ih, BG2, BORDER, 0.8, 4)
    c.drawImage(IMGS + 'whatif_chart.png', MG + 4, chart_bot + 4,
                width=CW - 8, height=ih - 8, preserveAspectRatio=True, anchor='c')

    mcta(c, 'Open Portfolio >> What-If tab to model positions live',
         'coiledspring.app/portfolio (What-If tab)')
    ftr(c, 11)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 12  -  CASE STUDY: QQQ PUT 620
# ══════════════════════════════════════════════════════════════════════════════
def p12_case(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 9', 'Case Study: QQQ PUT 620',
             'The real trade  -  from scanner to position management')
    y -= 8

    # Entry table (verbatim from brief)
    entry_items = [
        ('Ticker',       'QQQ  (Invesco QQQ Trust ETF)'),
        ('Strategy',     'Long PUT   -   benefit from IV expansion, hedge equity exposure'),
        ('Strike',       '$620  (12% OTM at entry)'),
        ('Expiry',       'June 17, 2027'),
        ('DTE',          '336 days'),
        ('Entry Mid',    '$31.23   ($3,123 per contract)'),
        ('IV at Entry',  '30.6%   (vs HV 30D ~ 21%)'),
        ('CS Score',     '72   Green  -  all 3 pillars confirmed'),
    ]
    tw = CW; th = 22; rh = 18
    c.setFillColor(BG3); c.rect(MG, y - th, tw, th, fill=1, stroke=0)
    dt(c, 'ENTRY  -  17 July 2026', MG + 10, y - 16, 'Helvetica-Bold', 9, GREEN2)
    dt(c, 'Entry confirmed by all 3 Coiled Spring pillars', W - MG - 8, y - 16, 'Helvetica', 8, TEXT3, 'right')
    for ri, (lb, val) in enumerate(entry_items):
        ry = y - th - (ri + 1) * rh
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820')); c.rect(MG, ry, tw, rh, fill=1, stroke=0)
        dt(c, lb + ':', MG + 10, ry + 5, 'Helvetica', 8, TEXT3)
        vcol = GREEN2 if 'CS Score' in lb else TEXT
        dt(c, val, MG + 148, ry + 5, 'Helvetica-Bold', 8.5, vcol)
        hl(c, MG, MG + tw, ry, BORDER, 0.2)
    y -= th + (len(entry_items) + 1) * rh + 10

    # WHY I ENTERED (left) + payoff chart (right)
    left_w = CW * 0.54; chart_w = CW * 0.43; gap = CW * 0.03
    chart_h = 136
    dt(c, 'Why I Entered', MG, y, 'Helvetica-Bold', 12, TEXT); y -= 18
    steps4 = [
        ('Step 1  -  HV Screener', 'QQQ HV Rank was 22. Lowest quartile in 52W range. Spring coiling.'),
        ('Step 2  -  Scanner',     'CS Score 72, IV 30.6% vs HV 30D ~21%. IV/HV ratio 1.45. 336 DTE.'),
        ('Step 3  -  Vol Surface', 'Flat blue surface across all strikes and maturities. No spikes.'),
        ('Step 4  -  What-If',     'Flat-price scenario showed profit from IV expansion alone.'),
    ]
    for si, (title, desc) in enumerate(steps4):
        c.setFillColor(ORANGE); c.circle(MG + 8, y + 3, 4, fill=1, stroke=0)
        dt(c, title, MG + 18, y + 1, 'Helvetica-Bold', 9, ORANGE)
        y -= 14
        dt(c, desc, MG + 18, y + 1, 'Helvetica', 8.5, TEXT2)
        y -= 16
    chart_x = MG + left_w + gap
    chart_y_top = y + 4 * 30 + 28
    dr(c, chart_x, chart_y_top - chart_h, chart_w, chart_h, BG2, BORDER, 0.5, 4)
    c.drawImage(IMGS + 'case_payoff.png', chart_x + 4, chart_y_top - chart_h + 4,
                width=chart_w - 8, height=chart_h - 8, preserveAspectRatio=True, anchor='c')
    dt(c, 'QQQ PUT 620  -  P&L by scenario',
       chart_x + chart_w / 2, chart_y_top - chart_h - 12, 'Helvetica', 7.5, TEXT3, 'center')
    y -= 10

    # Position Management timeline
    dt(c, 'Position Management', MG, y, 'Helvetica-Bold', 12, TEXT); y -= 14
    timeline = [
        ('Day 1',   'Entry at $31.23. Max risk $3,123. Allocation 2.1%. Checklist: 7/7 passed. All pillars green.', 'Entered',  GREEN2),
        ('Day 15',  'QQQ -3% to $685. Position -$142 (-4.5%). HV Rank 24. CS still 72. Checklist: HOLD.',           'Hold',     TEXT3),
        ('Day 45',  'QQQ flat. IV expands 30.6% to 35.2%. Position +$340 (+11%) from IV expansion alone.',          'Profit',   GREEN2),
        ('Day 60',  'Hypothetical: QQQ -8% to $649. IV 38%. Position ~+$1,850 (+59%). SELL if target hit.',         'Scenario', YELLOW),
        ('Day 120', 'Real position open. Monitoring. Thesis intact. IV still compressed vs 52W high ~55%.',          'Monitor',  BLUE),
    ]
    for day, desc, badge, col in timeline:
        rh3 = 34
        dr(c, MG, y - rh3, CW, rh3, BG2, BORDER, 0.5, 3)
        c.setFillColor(col); c.roundRect(MG + 8, y - rh3 + 8, 46, 18, 4, fill=1, stroke=0)
        dt(c, day, MG + 31, y - rh3 + 13, 'Helvetica-Bold', 8, white, 'center')
        wt(c, desc, MG + 62, y - 10, CW - 130, 'Helvetica', 8.5, TEXT2, 13)
        dt(c, badge, W - MG - 10, y - rh3 + 18, 'Helvetica-Bold', 8, col, 'right')
        y -= rh3 + 5

    # The Rule box
    y -= 4
    dr(c, MG, y - 30, CW, 26, BG3, ORANGE, 0.8, 4)
    dt(c, 'The Rule:', MG + 12, y - 10, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'Never close a long-dated position before 60 DTE if the 7-step checklist still validates the thesis.',
       MG + 72, y - 10, 'Helvetica', 9, TEXT)

    ftr(c, 12)


# ══════════════════════════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════════════════════
# PAGE 13 - PRE-TRADE CHECKLIST
# ══════════════════════════════════════════════════════════════════════════════
def p13_checklist(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 10', 'Pre-Trade Checklist',
             'Run before every entry. All 7 must pass. If any fails - skip.')
    y -= 14

    checks = [
        ('1', 'HV Rank < 30',
         'Open HV Screener. Sort ASC. Verify rank < 30. Target < 15.',
         'If HV Rank >= 30, spring not compressed. Skip.'),
        ('2', 'CS Score >= 70',
         'Scanner shows CS in green (70+). Target 75+.',
         'Score < 70 = quality factor failing. Do not override.'),
        ('3', 'DTE 90 to 730',
         'Min 90 DTE. Preferred 180-400. Short-dated = punishing theta.',
         'Beyond 730 = wide spreads. Stay in the sweet spot.'),
        ('4', 'Delta 0.15 to 0.45',
         'Avoid deep OTM (< 0.10): too far. Avoid near-ATM (> 0.50): too expensive.',
         ''),
        ('5', 'Bid-Ask Spread < 5%',
         'Check Spread % column. If spread > 5% of option mid, liquidity poor.',
         'Reduce size or skip.'),
        ('6', 'No binary event in 60 DTE',
         'Check earnings, FDA, macro events in first 60 days.',
         'IV already elevated if found. Wait, then re-scan.'),
        ('7', 'Size <= 3% of account',
         'Max loss = premium x 100 x contracts. Must not exceed 3% of account.',
         'Non-negotiable. Scale down if needed.'),
    ]

    item_h = 76; pad = 6
    for step, title, desc, fail in checks:
        dr(c, MG, y - item_h, CW, item_h, BG2, BORDER, 0.3, 4)
        # Step circle
        c.setFillColor(ORANGE)
        c.circle(MG + 16, y - item_h/2 + 2, 11, fill=1, stroke=0)
        dt(c, step, MG + 16, y - item_h/2 - 4, 'Helvetica-Bold', 10, white, 'center')
        # Checkbox outline
        inner_x = MG + 36
        inner_w = CW - 50
        dr(c, W - MG - 22, y - 14, 14, 14, None, BORDER, 0.8, 2)
        dt(c, '[ ]', W - MG - 22, y - 13, 'Helvetica', 8, TEXT3)
        # Title
        dt(c, title, inner_x, y - 14, 'Helvetica-Bold', 10.5, TEXT)
        # Description
        wt(c, desc, inner_x, y - 28, inner_w, 'Helvetica', 9, TEXT2, 13)
        # Fail note (if any)
        if fail:
            dt(c, 'Skip: ' + fail, inner_x, y - item_h + 10, 'Helvetica-Oblique', 8, RED)
        y -= item_h + pad

    y -= 8

    # Two outcome boxes side by side
    bw = (CW - 8) / 2
    bh = 38

    # Green box — ALL 7 PASSED
    dr(c, MG, y - bh, bw, bh, HexColor('#0D2010'), GREEN, 1.0, 4)
    dt(c, 'ALL 7 PASSED', MG + bw/2, y - 13, 'Helvetica-Bold', 11, GREEN, 'center')
    dt(c, 'GREEN LIGHT - place the trade', MG + bw/2, y - 28, 'Helvetica', 9, TEXT2, 'center')

    # Red box — ANY FAILED
    dr(c, MG + bw + 8, y - bh, bw, bh, HexColor('#200D0D'), RED, 1.0, 4)
    dt(c, 'ANY FAILED', MG + bw + 8 + bw/2, y - 13, 'Helvetica-Bold', 11, RED, 'center')
    dt(c, 'SKIP - wait for a better setup', MG + bw + 8 + bw/2, y - 28, 'Helvetica', 9, TEXT2, 'center')

    mcta(c, 'Run the scanner and check your next candidate', 'coiledspring.app/scanner')
    ftr(c, 13)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 14 - START TRADING WITH AN EDGE
# ══════════════════════════════════════════════════════════════════════════════
def p14_cta(c):
    fbg(c)
    y = shdr(c, 'FINAL', 'Start Trading with an Edge',
             'Full access - 14-day free trial')
    y -= 14

    wt(c, 'You now have the complete Coiled Spring framework. The terminal brings it all together - live across 1,100+ tickers.',
       MG, y, CW, 'Helvetica', 11, TEXT2, 16)
    y -= 46

    # 8 features — 2-column grid (4 rows x 2 cols)
    features = [
        ('Real-time Scanner',
         'Filter 1,100+ by IV, DTE, Delta, CS Score.',
         'HV Screener (1,019)',
         'Daily HV rank. Spot compression in 30 seconds.'),
        ('3D Volatility Surface',
         'Interactive Plotly. Click any point.',
         'Portfolio Tracker',
         'Unlimited positions. Live P&L and Greeks.'),
        ('What-If Simulator',
         'Model payoffs pre-trade. No surprises.',
         'IV History Database',
         'Daily snapshots since July 2026.'),
        ('Watchlist',
         'Save setups. One-click return.',
         'Priority Support',
         'Email + community access. Included.'),
    ]

    fw = (CW - 8) / 2; fh = 64
    for row, (lt, ld, rt, rd) in enumerate(features):
        ry = y - row * (fh + 6)
        # Left feature
        dr(c, MG, ry - fh, fw, fh, BG2, BORDER, 0.5, 4)
        c.setFillColor(ORANGE); c.rect(MG, ry - 3, fw, 3, fill=1, stroke=0)
        dt(c, lt, MG + 10, ry - 16, 'Helvetica-Bold', 10, TEXT)
        wt(c, ld, MG + 10, ry - 30, fw - 18, 'Helvetica', 9, TEXT2, 13)
        # Right feature
        rx = MG + fw + 8
        dr(c, rx, ry - fh, fw, fh, BG2, BORDER, 0.5, 4)
        c.setFillColor(BLUE); c.rect(rx, ry - 3, fw, 3, fill=1, stroke=0)
        dt(c, rt, rx + 10, ry - 16, 'Helvetica-Bold', 10, TEXT)
        wt(c, rd, rx + 10, ry - 30, fw - 18, 'Helvetica', 9, TEXT2, 13)
    y -= 4 * (fh + 6) + 14

    # Big CTA box
    cta_h = 88
    c.setFillColor(ORANGE)
    c.roundRect(MG, y - cta_h, CW, cta_h, 8, fill=1, stroke=0)
    dt(c, '>> START YOUR FREE TRIAL', W/2, y - 24, 'Helvetica-Bold', 16, white, 'center')
    dt(c, 'coiledspring.app', W/2, y - 46, 'Helvetica-Bold', 13, white, 'center')
    hl(c, W/2 - 70, W/2 + 70, y - 50, white, 0.5)
    dt(c, '14-day full access  ·  No credit card  ·  Cancel anytime',
       W/2, y - 64, 'Helvetica', 9, HexColor('#FFD9C8'), 'center')
    y -= cta_h + 12

    # Footer links
    dt(c, 'Questions?  support@coiledspring.app', MG, y, 'Helvetica', 9, TEXT3)
    dt(c, 'Newsletter:  coiledspring.substack.com', MG + CW/2, y, 'Helvetica', 9, TEXT3)

    ftr(c, 14)

def p15_about(c):
    fbg(c)
    # Custom header - no chapter number
    c.setFillColor(ORANGE); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    c.setFillColor(BG2); c.rect(0, H - 96, W, 90, fill=1, stroke=0)
    dt(c, 'ABOUT THE AUTHOR', MG, H - 60, 'Helvetica-Bold', 24, TEXT)
    hl(c, 0, W, H - 95, BORDER, 0.8)
    y = H - 112

    y -= 16

    # Name + title
    dt(c, 'Francesco Sgarbossa', MG, y, 'Helvetica-Bold', 20, TEXT)
    y -= 22
    dt(c, 'Quantitative Options Trader  |  Builder of Coiled Spring Terminal',
       MG, y, 'Helvetica', 11, ORANGE)
    y -= 6
    hl(c, MG, MG + CW, y, BORDER, 0.5)
    y -= 16

    # Bio paragraphs
    bio1 = ('Francesco is a self-taught quantitative options trader based in Italy '
            'with a background in banking IT systems and financial engineering. '
            'He built the Coiled Spring Terminal to solve a problem he faced: '
            'no affordable tool combined HV screening, options scanning with a '
            'structural quality score, and a 3D volatility surface in one platform.')
    h1 = wt(c, bio1, MG, y, CW, 'Helvetica', 10, TEXT2, 16)
    y -= h1 + 10

    bio2 = ('The Coiled Spring methodology emerged from years of research into '
            'volatility mean reversion, term structure dynamics, and structured '
            'options strategies. The CS Score distills this into one actionable signal.')
    h2 = wt(c, bio2, MG, y, CW, 'Helvetica', 10, TEXT2, 16)
    y -= h2 + 10

    bio3 = ('The terminal runs 24/7 on Railway infrastructure, collects IV snapshots '
            'daily for 1,100+ tickers, and is continuously updated.')
    h3 = wt(c, bio3, MG, y, CW, 'Helvetica', 10, TEXT2, 16)
    y -= h3 + 20

    # 4-metric row — single-line labels
    stats4 = [
        ('10+ yrs', 'Options Trading'),
        ('1,100+',  'Tickers Monitored'),
        ('Daily',   'IV Collection'),
        ('100%',    'Self-Built'),
    ]
    sw = CW / 4
    for si, (val, lbl) in enumerate(stats4):
        sx = MG + si * sw
        dr(c, sx + 4, y - 52, sw - 8, 48, BG3, BORDER, 0.4, 4)
        dt(c, val, sx + sw/2, y - 16, 'Helvetica-Bold', 18, ORANGE, 'center')
        dt(c, lbl, sx + sw/2, y - 34, 'Helvetica', 8, TEXT3, 'center')
    y -= 62

    # Links
    links = [
        ('Web:',       'coiledspring.app'),
        ('Substack:',  'coiledspring.substack.com'),
        ('Email:',     'support@coiledspring.app'),
    ]
    for lbl, url in links:
        dt(c, lbl, MG, y, 'Helvetica-Bold', 9.5, TEXT3)
        dt(c, url,  MG + 62, y, 'Helvetica', 9.5, BLUE)
        y -= 15
    y -= 10

    # Quote box
    quote_h = 90
    dr(c, MG, y - quote_h, CW, quote_h, BG2, ORANGE, 0.8, 6)
    dt(c, '"', MG + 14, y - 8, 'Helvetica-Bold', 32, ORANGE)
    quote_lines = [
        'Markets are not random in volatility. They cycle.',
        'When the spring compresses, it will release.',
        'Your job is to be positioned before the release -',
        'not to predict direction, but to profit from the expansion.',
    ]
    qy = y - 18
    for ql in quote_lines:
        dt(c, ql, MG + 40, qy, 'Helvetica', 10, TEXT)
        qy -= 14
    dt(c, '- Francesco Sgarbossa', MG + CW - 12, y - quote_h + 12,
       'Helvetica-Bold', 9, TEXT3, 'right')
    y -= quote_h + 16

    # Disclaimer
    disc_h = 38
    dr(c, MG, y - disc_h, CW, disc_h, BG3, BORDER, 0.3, 4)
    dt(c, 'Educational purposes only. Options trading involves substantial risk of loss.',
       MG + 12, y - 13, 'Helvetica', 8, TEXT3)
    dt(c, 'Past performance does not guarantee future results.',
       MG + 12, y - 27, 'Helvetica', 8, TEXT3)

    # Copyright
    dt(c, '(c) 2026 Coiled Spring  ·  coiledspring.app  ·  All rights reserved.',
       W/2, 20, 'Helvetica', 7.5, TEXT3, 'center')

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle('Coiled Spring  -  Options Trading Playbook v1.6')
    c.setAuthor('Francesco Sgarbossa')
    c.setSubject('Volatility compression strategy  -  scanner, checklist, case study')

    pages = [
        p1_cover, p2_metaphor, p3_lose, p4_pillars,
        p5_scanner, p6_row, p7_hv, p8_vol_surface,
        p9_qqq_surface, p10_portfolio, p11_whatif, p12_case,
        p13_checklist, p14_cta, p15_about,
    ]
    for i, fn in enumerate(pages):
        print(f'  Rendering page {i+1}/15: {fn.__name__} ...', flush=True)
        fn(c)
        if i < len(pages) - 1:
            c.showPage()

    c.save()
    size_kb = os.path.getsize(OUT) // 1024
    print(f'\n[OK]  PDF written: {OUT}  ({size_kb} KB)', flush=True)

if __name__ == '__main__':
    main()
