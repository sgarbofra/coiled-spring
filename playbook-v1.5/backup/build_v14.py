#!/usr/bin/env python3
"""Coiled Spring Playbook v1.4 — publication-ready"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
import math, os

BG  = HexColor('#0D1117'); BG2 = HexColor('#161B22'); BG3 = HexColor('#21262D')
ORANGE=HexColor('#FF6B35'); BLUE=HexColor('#58A6FF'); GREEN=HexColor('#3FB950')
RED=HexColor('#F85149'); YELLOW=HexColor('#E3B341'); PURPLE=HexColor('#BC8CFF')
GREEN2=HexColor('#00C853')
TEXT=HexColor('#E6EDF3'); TEXT2=HexColor('#B1BAC4'); TEXT3=HexColor('#7D8590')
BORDER=HexColor('#30363D')

W, H = A4          # 595.27 x 841.89 pt
MG   = 50          # margin

IMGS = '/sessions/laughing-beautiful-planck/mnt/outputs/'
OUT  = '/sessions/laughing-beautiful-planck/mnt/coiled-spring-backend2/Documentazione funzionale/CoiledSpring_Playbook_v1.4.pdf'

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def fbg(c):
    c.setFillColor(BG); c.rect(0, 0, W, H, fill=1, stroke=0)

def np_(c):
    c.showPage(); fbg(c)

def dt(c, t, x, y, f='Helvetica', s=11, col=None, a='left'):
    if col is None: col = TEXT
    c.setFont(f, s); c.setFillColor(col)
    if   a == 'center': c.drawCentredString(x, y, t)
    elif a == 'right':  c.drawRightString(x, y, t)
    else:               c.drawString(x, y, t)

def dr(c, x, y, w, h, fill=None, stroke=None, sw=1, r=4):
    if fill   is None: fill   = BG2
    if stroke is None: stroke = BORDER
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(sw)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)

def hl(c, x1, x2, y, col=None, w=0.5):
    if col is None: col = BORDER
    c.setStrokeColor(col); c.setLineWidth(w); c.line(x1, y, x2, y)

def wt(c, txt, x, y, mw, f='Helvetica', s=11, col=None, lh=16):
    """Word-wrap text; returns height used."""
    if col is None: col = TEXT
    c.setFont(f, s); c.setFillColor(col)
    words = txt.split(); line = ''; lines = []
    for word in words:
        test = (line + ' ' + word).strip()
        if c.stringWidth(test, f, s) <= mw: line = test
        else:
            if line: lines.append(line)
            line = word
    if line: lines.append(line)
    for i, l in enumerate(lines):
        c.drawString(x, y - i*lh, l)
    return len(lines) * lh

def logo(c, cx, cy, r=22):
    c.setFillColor(ORANGE); c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColor(white); c.setFont('Helvetica-Bold', int(r*0.85))
    c.drawCentredString(cx, cy - r*0.28, 'CS')

# ─── FOOTER — consistent on all pages ────────────────────────────────────────
def ftr(c, n, tot=15):
    hl(c, MG, W-MG, 30, BORDER, 0.5)
    dt(c, 'The Coiled Spring Playbook', MG, 14, 'Helvetica', 8, TEXT3)
    dt(c, 'coiledspring.app', W/2, 14, 'Helvetica', 8, ORANGE, 'center')
    dt(c, f'{n} / {tot}', W-MG, 14, 'Helvetica', 8, TEXT3, 'right')

# ─── PAGE HEADER — returns content start y ────────────────────────────────────
def shdr(c, num, title, sub=''):
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, num,   MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, title, MG, H-62, 'Helvetica-Bold', 24, TEXT)
    y = H-62
    if sub:
        y = H-80
        dt(c, sub, MG, y, 'Helvetica', 10.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)
    return H-112

# ─── MICRO-CTA — fixed at y=72, height 42 ─────────────────────────────────────
def micro_cta(c, feature, url):
    by = 72; bh = 42
    c.setFillColor(BG2); c.setStrokeColor(ORANGE); c.setLineWidth(0.8)
    c.roundRect(MG, by, W-MG*2, bh, 4, fill=1, stroke=1)
    c.setFillColor(ORANGE); c.rect(MG, by+bh-4, W-MG*2, 4, fill=1, stroke=0)
    dt(c, u'→ TRY IT NOW:', MG+12, by+bh-14, 'Helvetica-Bold', 9, ORANGE)
    dt(c, feature, MG+100, by+bh-14, 'Helvetica', 9, TEXT2)
    dt(c, url, W-MG-12, by+bh-14, 'Helvetica-Bold', 9, ORANGE, 'right')
    dt(c, '14-day free trial  ·  No credit card needed', MG+12, by+10, 'Helvetica', 8, TEXT3)

# ─── PROMISE BOX ─────────────────────────────────────────────────────────────
def promise_box(c, x, y, w):
    items = [
        'Identify HV Rank <30 setups in under 2 minutes',
        'Read the 3D Volatility Surface like a pro',
        'Build asymmetric LEAPS positions with defined risk',
        'Run the 7-point pre-trade checklist before every entry',
        'Model payoffs with the What-If Simulator before execution',
    ]
    bh = len(items)*22 + 36
    dr(c, x, y-bh, w, bh, BG3, ORANGE, 1.2, 6)
    dt(c, 'WHAT YOU WILL FIND IN THIS PLAYBOOK', x+12, y-16, 'Helvetica-Bold', 9, ORANGE)
    for i, item in enumerate(items):
        iy = y-18-18 - i*22
        c.setFillColor(GREEN2); c.circle(x+22, iy+4, 5, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 7); c.drawCentredString(x+22, iy+1, u'✓')
        dt(c, item, x+36, iy, 'Helvetica', 9.5, TEXT)
    dt(c, u'Start at Chapter 4 — The Scanner  →  coiledspring.app/scanner',
       x+12, y-bh+12, 'Helvetica-Oblique', 9, ORANGE)
    return bh

# ─── SCANNER TABLE — 8 columns ───────────────────────────────────────────────
SCAN_COLS = [('TICKER',58),('TYPE',38),('STRIKE',48),('EXPIRATION',80),
             ('DTE',36),('MID',50),('IV',50),('CS SCORE',45)]

SCAN_ROWS = [
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

def cs_col(sc):
    s = int(sc)
    return GREEN2 if s >= 70 else (YELLOW if s >= 50 else RED)

def scanner_table(c, x, y, w, rows):
    tot = sum(cw for _,cw in SCAN_COLS)
    cws = [(n, cw/tot*w) for n,cw in SCAN_COLS]
    rh=20; hh=22
    c.setFillColor(BG3); c.rect(x, y-hh, w, hh, fill=1, stroke=0)
    xi = x+6
    for n,cw in cws:
        dt(c, n, xi, y-16, 'Helvetica-Bold', 8, ORANGE); xi += cw
    for ri, row in enumerate(rows):
        ry = y - hh - ri*rh
        if ri%2 == 0:
            c.setFillColor(HexColor('#141820')); c.rect(x, ry, w, rh, fill=1, stroke=0)
        xi = x+6
        for ci,(val,(n,cw)) in enumerate(zip(row, cws)):
            if   ci==0: dt(c, val, xi, ry+6, 'Helvetica-Bold', 9, ORANGE)
            elif ci==1: dt(c, val, xi, ry+6, 'Helvetica-Bold', 9, RED if val=='PUT' else BLUE)
            elif ci==6: dt(c, val, xi, ry+6, 'Helvetica', 9, BLUE)
            elif ci==7:
                col = cs_col(val)
                c.setFillColor(col); c.roundRect(xi, ry+4, 30, 14, 3, fill=1, stroke=0)
                dt(c, val, xi+4, ry+6, 'Helvetica-Bold', 9, white)
            else: dt(c, val, xi, ry+6, 'Helvetica', 9, TEXT2)
            xi += cw
        hl(c, x, x+w, ry, BORDER, 0.25)
    return hh + len(rows)*rh

# ─── HV TABLE ─────────────────────────────────────────────────────────────────
HV_COLS = [('TICKER',44),('COMPANY',148),('HV 30D %',62),('HV RANK',58),
           ('HV PCT',50),('52W MAX',60),('52W MIN',58)]
HV_ROWS = [
    ('NIO',  'NIO Inc.',                '40.3%','0.0', '0.0%', '89.4%','40.3%'),
    ('MGM',  'MGM Resorts Int.',         '23.1%','0.0', '0.0%', '58.1%','23.1%'),
    ('BBAI', 'BigBear.ai Holdings',      '57.5%','0.2', '0.5%','117.5%','57.4%'),
    ('TMHC', 'Taylor Morrison Home',     '2.9%', '0.3', '0.5%', '66.6%', '2.7%'),
    ('SNPS', 'Synopsys Inc.',            '29.5%','0.5', '0.5%','146.9%','28.9%'),
    ('CZR',  'Caesars Entertainment',    '12.8%','0.6', '2.3%', '85.1%','12.4%'),
    ('AES',  'AES Corporation',          '4.0%', '1.0', '2.7%', '70.5%', '3.4%'),
    ('JHG',  'Janus Henderson Group',    '1.8%', '1.0', '8.5%', '45.0%', '1.3%'),
    ('WST',  'West Pharma Services',     '21.8%','1.2', '0.9%', '69.6%','21.2%'),
    ('RAMP', 'LiveRamp Holdings',        '5.6%', '1.2', '4.5%', '78.7%', '4.7%'),
    ('PCRX', 'Pacira BioSciences',       '22.3%','1.5', '1.8%', '58.3%','21.8%'),
    ('HCSG', 'Healthcare Services Grp',  '26.3%','2.0', '1.8%', '62.2%','25.6%'),
    ('LVS',  'Las Vegas Sands',          '20.8%','2.3', '6.3%', '56.0%','20.0%'),
    ('HUM',  'Humana Inc.',              '34.8%','3.1', '1.4%', '81.3%','33.5%'),
]

def hv_table(c, x, y, w, rows):
    tot = sum(cw for _,cw in HV_COLS)
    cws = [(n, cw/tot*w) for n,cw in HV_COLS]
    rh=20; hh=22
    c.setFillColor(BG3); c.rect(x, y-hh, w, hh, fill=1, stroke=0)
    xi = x+6
    for n,cw in cws: dt(c, n, xi, y-16, 'Helvetica-Bold', 8, ORANGE); xi += cw
    for ri, row in enumerate(rows):
        ry = y - hh - ri*rh
        if ri%2 == 0:
            c.setFillColor(HexColor('#141820')); c.rect(x, ry, w, rh, fill=1, stroke=0)
        xi = x+6
        for ci,(val,(n,cw)) in enumerate(zip(row, cws)):
            if ci==0:
                dt(c, val, xi, ry+6, 'Helvetica-Bold', 9, ORANGE)
            elif ci==1:
                dt(c, val[:26], xi, ry+6, 'Helvetica', 8, TEXT2)
            elif ci==3:
                rank = float(val)
                col = GREEN2 if rank < 30 else (YELLOW if rank < 80 else RED)
                c.setFillColor(col); c.roundRect(xi, ry+4, 30, 14, 2, fill=1, stroke=0)
                dt(c, val, xi+4, ry+6, 'Helvetica-Bold', 8, white)
            elif ci==4: dt(c, val, xi, ry+6, 'Helvetica', 8, GREEN2)
            elif ci==5: dt(c, val, xi, ry+6, 'Helvetica', 8, RED)
            else:       dt(c, val, xi, ry+6, 'Helvetica', 8, TEXT2)
            xi += cw
        hl(c, x, x+w, ry, BORDER, 0.25)
    return hh + len(rows)*rh


# ═══════════════════════════ PAGE FUNCTIONS ═══════════════════════════════════

# ── PAGE 1: COVER ─────────────────────────────────────────────────────────────
def p1_cover(c):
    fbg(c)
    c.setFillColor(ORANGE); c.rect(0, H-8, W, 8, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, 0, W, 6, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.circle(W-MG-26, H-52, 26, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 10); c.drawCentredString(W-MG-26, H-46, 'FREE')
    c.setFont('Helvetica-Bold', 10); c.drawCentredString(W-MG-26, H-58, 'PDF')
    logo(c, W/2, H-140, 48)
    dt(c, 'COILED SPRING OPTIONS TERMINAL', W/2, H-198, 'Helvetica-Bold', 8.5, ORANGE, 'center')
    hl(c, MG+30, W-MG-30, H-210, BORDER, 0.8)
    dt(c, 'The Coiled Spring', W/2, H-256, 'Helvetica-Bold', 34, TEXT,   'center')
    dt(c, 'Playbook',          W/2, H-296, 'Helvetica-Bold', 34, ORANGE, 'center')
    hl(c, MG+30, W-MG-30, H-314, BORDER, 0.5)
    dt(c, 'How to Find Low-IV Options Before They Expand',
       W/2, H-336, 'Helvetica', 13, TEXT2, 'center')
    dt(c, u'— And Trade Them Profitably',
       W/2, H-354, 'Helvetica-Oblique', 12, TEXT3, 'center')
    pills = [('SCANNER', ORANGE), ('VOL SURFACE', BLUE), ('PAYOFF ANALYSIS', GREEN)]
    pw = (W-MG*2-16)/3
    for i,(lb,col) in enumerate(pills):
        px = MG + i*(pw+8)
        c.setFillColor(BG3); c.setStrokeColor(col); c.setLineWidth(0.8)
        c.roundRect(px, H-392, pw, 24, 4, fill=1, stroke=1)
        dt(c, lb, px+pw/2, H-385, 'Helvetica-Bold', 8, col, 'center')
    stats = [('1,100+','Tickers'), ('Daily','IV Snapshots'), ('15+','Countries')]
    sw = (W-MG*2)/3
    for i,(v,lb) in enumerate(stats):
        sx = MG + i*sw + sw/2
        dt(c, v,  sx, H-430, 'Helvetica-Bold', 20, ORANGE, 'center')
        dt(c, lb, sx, H-448, 'Helvetica',       9, TEXT3,  'center')
    hl(c, MG, W-MG, H-460, BORDER, 0.5)
    wt(c, 'Most options traders lose money because they overpay for volatility. This playbook teaches the quantitative framework behind the Coiled Spring strategy — how to systematically identify underpriced options in compressed-IV environments and build asymmetric positions before the release.',
       MG, H-480, W-MG*2, 'Helvetica', 10, TEXT3, 15)
    hl(c, MG, W-MG, 110, BORDER, 0.5)
    logo(c, MG+20, 80, 18)
    dt(c, 'Francesco Sgarbossa',                               MG+46, 92, 'Helvetica-Bold', 11, TEXT)
    dt(c, 'Quant Options Trader  |  Builder of Coiled Spring', MG+46, 78, 'Helvetica', 9, TEXT3)
    dt(c, 'coiledspring.app', W-MG, 80, 'Helvetica', 9, ORANGE, 'right')

# ── PAGE 2: METAPHOR — redesigned with arrows, pull-quote, promise box ─────────
def p2_metaphor(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 1', 'The Coiled Spring Metaphor',
             'When compressed volatility becomes your edge')
    y -= 14

    # Intro
    wt(c, 'In mechanics, a coiled spring stores energy when compressed. The tighter the coil, the more explosive the release. Options work identically: when Implied Volatility falls to historic lows, the spring loads. When a catalyst arrives, it releases — and premium re-prices sharply upward.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 66

    # 4-phase boxes with arrows between them
    # Gap between boxes = 18pt so we can fit a centred arrow (14pt font) cleanly
    phases = [
        ('1', 'IV COMPRESSES',
         'HV Rank < 30. Market is calm. Options are cheap. The spring is loading.',
         GREEN2),
        ('2', 'PRICE COILS',
         'Underlying consolidates. Volume drops. Energy builds in silence.',
         BLUE),
        ('3', 'CATALYST',
         'Earnings, macro event, breakout. Maximum compression before release.',
         YELLOW),
        ('4', 'IV EXPANDS',
         'IV spikes. Long-premium positions profit from re-pricing — any direction.',
         ORANGE),
    ]
    arrow_gap = 18
    pw = (W - MG*2 - arrow_gap*3) / 4
    box_h = 112
    for i, (num, title, desc, col) in enumerate(phases):
        px = MG + i * (pw + arrow_gap)
        dr(c, px, y - box_h, pw, box_h, BG2, col, 1.2, 6)
        c.setFillColor(col); c.rect(px, y-4, pw, 4, fill=1, stroke=0)
        c.setFillColor(col); c.circle(px + pw/2, y - 22, 14, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 13)
        c.drawCentredString(px + pw/2, y - 27, num)
        dt(c, title, px + pw/2, y - 45, 'Helvetica-Bold', 8.5, col, 'center')
        wt(c, desc, px + 8, y - 62, pw - 16, 'Helvetica', 8.5, TEXT2, 13)
        if i < 3:
            ax = px + pw + arrow_gap / 2
            c.setFillColor(ORANGE); c.setFont('Helvetica-Bold', 14)
            c.drawCentredString(ax, y - box_h/2 - 4, u'→')
    y -= box_h + 18

    # Pull-quote
    qh = 80
    c.setFillColor(BG2); c.roundRect(MG, y-qh, W-MG*2, qh, 6, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(MG, y-qh, 4, qh, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.setFont('Helvetica-Bold', 30)
    c.drawString(MG+16, y-22, u'"')
    wt(c, 'The edge is not predicting direction — it is identifying when the market underprices uncertainty, then being positioned when it re-prices.',
       MG+32, y-20, W-MG*2-50, 'Helvetica-Oblique', 11, TEXT, 17)
    dt(c, u'— Francesco Sgarbossa', W-MG-8, y-qh+14, 'Helvetica', 9, TEXT3, 'right')
    y -= qh + 18

    # Promise box (5 items)
    promise_box(c, MG, y, W-MG*2)

    micro_cta(c, 'Start scanning for compressed volatility setups now', 'coiledspring.app')
    ftr(c, 2)

# ── PAGE 3: PROBLEM — fixed boxes, 3-col table, 3 testimonials ────────────────
def p3_problem(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 2', 'Why Retail Options Traders Lose',
             'The structural disadvantage — and how to flip it')
    y -= 12

    wt(c, 'Studies show 70-80% of retail options buyers lose money. This is structural, not bad luck: most traders buy options AFTER the move, when IV is already elevated — paying maximum premium at exactly the wrong time.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 52

    # 3 mistake boxes — taller (88pt) to avoid text overflow
    mistakes = [
        ('Buying at Peak IV',
         'Buy calls/puts AFTER a big move. IV already elevated. You pay max premium at the worst moment. Theta works against you from day 1.',
         RED),
        ('Wrong DTE',
         'Short-dated options (< 30 DTE): theta destroys value every day. The clock runs against you. Long options need time to breathe.',
         RED),
        ('No Entry Criteria',
         'No IV filter, no quality score, no DTE rule. Speculation without a framework. Every trade becomes a guess.',
         RED),
    ]
    bw = (W - MG*2 - 12) / 3
    box_top_h = 92   # tall enough for 4 lines of 9.5pt text at lh=14
    for i, (title, desc, col) in enumerate(mistakes):
        bx = MG + i * (bw + 6)
        dr(c, bx, y - box_top_h, bw, box_top_h - 4, BG2, col, 1)
        c.setFillColor(col); c.rect(bx, y-4, bw, 4, fill=1, stroke=0)
        dt(c, title, bx+10, y-18, 'Helvetica-Bold', 10.5, col)
        wt(c, desc, bx+10, y-34, bw-18, 'Helvetica', 9, TEXT2, 13)
    y -= box_top_h + 12

    dt(c, 'The Coiled Spring Solution', MG, y, 'Helvetica-Bold', 15, ORANGE)
    y -= 22
    wt(c, 'Screen for stocks where IV Rank is below 30 — historically cheap. Enter long-dated options (90-730 DTE) before the catalyst. Let IV mean reversion work as a structural tailwind — even if price barely moves, IV expansion profits the position.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 56

    # Comparison table — rh=22 for breathing room, "IV Environment" properly spaced
    tw = W - MG*2; th = 22; rh = 22
    headers = ['Dimension', 'Retail Approach', 'Coiled Spring']
    c.setFillColor(BG3); c.rect(MG, y-th, tw, th, fill=1, stroke=0)
    col_w = tw / 3
    for i, h in enumerate(headers):
        dt(c, h, MG + i*col_w + 10, y-15, 'Helvetica-Bold', 9, ORANGE)
    rows = [
        ('Entry Timing',       'After move — IV elevated',  'Before move — IV compressed'),
        ('IV Environment',     'IV Rank 70-100 (expensive)','IV Rank < 30 (underpriced)'),
        ('DTE',                '7-30 days (theta kills)',   '90-730 days (time to breathe)'),
        ('Edge Source',        'Direction guess',           'IV mean reversion'),
    ]
    for ri, (d, bad, good) in enumerate(rows):
        ry = y - th - (ri+1)*rh
        if ri % 2 == 0:
            c.setFillColor(HexColor('#141820')); c.rect(MG, ry, tw, rh, fill=1, stroke=0)
        dt(c, d,    MG + 10,           ry + 7, 'Helvetica-Bold', 9,   TEXT)
        dt(c, bad,  MG + col_w + 10,  ry + 7, 'Helvetica',      9,   RED)
        dt(c, good, MG + 2*col_w + 10, ry + 7, 'Helvetica',     9,   GREEN2)
        hl(c, MG, MG+tw, ry, BORDER, 0.3)
    y -= th + len(rows)*rh + 14

    # Social proof box — 3 testimonials
    testi = [
        (u'"Finally a scanner that gives me data, not signals."', '— Beta User, US'),
        (u'"HV Rank + CS Score changed how I find options. No more guessing."', '— Beta User, UK'),
        (u'"First LEAPS using the checklist. Clear, disciplined, profitable."', '— Beta User, CA'),
    ]
    stats_h = 62; testi_h = len(testi) * 22 + 14
    bh = stats_h + testi_h
    dr(c, MG, y-bh, W-MG*2, bh, BG3, BORDER, 0.5, 6)
    dt(c, 'COILED SPRING TERMINAL — BY THE NUMBERS', MG+12, y-16, 'Helvetica-Bold', 9, ORANGE)
    stats_list = [('1,100+','tickers'), ('4,173+','IV pts/day'), ('100%','self-built'), ('15+','countries')]
    sw_s = (W-MG*2-24)/4
    for i,(v,lb) in enumerate(stats_list):
        sx = MG+12 + i*sw_s + sw_s/2
        dt(c, v,  sx, y-38, 'Helvetica-Bold', 15, ORANGE, 'center')
        dt(c, lb, sx, y-52, 'Helvetica',       8, TEXT3,  'center')
    hl(c, MG+12, MG+W-MG*2-12, y-stats_h, BORDER, 0.4)
    for i, (quote, attr) in enumerate(testi):
        ty2 = y - stats_h - 18 - i*22
        c.setFillColor(BG2); c.roundRect(MG+10, ty2-15, W-MG*2-20, 18, 3, fill=1, stroke=0)
        dt(c, quote, MG+22, ty2-9, 'Helvetica-Oblique', 8.5, TEXT2)
        dt(c, attr,  W-MG-14, ty2-9, 'Helvetica-Bold', 8, ORANGE, 'right')

    ftr(c, 3)


# ── PAGE 4: 3 PILLARS — vertical layout, verified no typos ───────────────────
def p4_pillars(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 3', 'The 3 Pillars of the Strategy',
             'All three must align. No exceptions.')
    y -= 10

    pillars = [
        ('1', 'HV COMPRESSION', 'HV Rank < 30', GREEN2,
         'HV Rank tells you where current 30-day realized volatility sits in its 52-week range. Below 30 means near historic lows — you are not competing with elevated premium.',
         ['HV 30D% at multi-month low', 'HV Rank < 30 (target: < 15)', 'HV PCT in lowest quartile', '52W range confirms compression']),
        ('2', 'QUALITY SCORE', 'CS Score >= 70', ORANGE,
         'The Coiled Spring Score (0-100) synthesizes IV/HV compression, liquidity, bid-ask quality, open interest, delta and time structure into one number. Score >= 70 = all factors aligned.',
         ['CS Score >= 70 (target: 75+)', 'IV/HV ratio < 1.2', 'Open Interest > 500 contracts', 'Bid-Ask Spread% < 5%']),
        ('3', 'TIME EDGE', '90 <= DTE <= 730', BLUE,
         'Long-dated options give the thesis time to develop and minimize daily theta impact. With 300+ DTE remaining, you can be wrong on timing and still profit when IV expansion arrives.',
         ['DTE >= 90 days minimum', 'DTE >= 180 days preferred', 'Expiry beyond catalyst + 60d', 'Review and roll at 60 DTE']),
    ]

    box_h = 130  # tall enough for all content without overflow
    gap = 10
    for pn, title, tag, col, desc, bullets in pillars:
        dr(c, MG, y-box_h, W-MG*2, box_h, BG2, col, 1.5, 6)
        c.setFillColor(col); c.rect(MG, y-4, W-MG*2, 4, fill=1, stroke=0)
        c.setFillColor(col); c.circle(MG+24, y-22, 15, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 13)
        c.drawCentredString(MG+24, y-27, pn)
        dt(c, title, MG+46, y-14, 'Helvetica-Bold', 13, TEXT)
        tw2 = c.stringWidth(tag, 'Helvetica-Bold', 9)
        c.setFillColor(col); c.roundRect(MG+46, y-32, tw2+12, 14, 3, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 9)
        c.drawString(MG+52, y-27, tag)
        left_w = (W-MG*2) * 0.54
        wt(c, desc, MG+12, y-52, left_w-12, 'Helvetica', 9.5, TEXT2, 13)
        bx = MG + left_w + 8
        bw_r = (W-MG*2) - left_w - 20
        for bi, b in enumerate(bullets):
            by2 = y - 52 - bi*19
            c.setFillColor(col); c.circle(bx+5, by2+4, 3, fill=1, stroke=0)
            dt(c, b, bx+14, by2, 'Helvetica', 9, TEXT2)
        y -= box_h + gap

    # Summary rule
    dr(c, MG, y-40, W-MG*2, 36, BG3, BORDER, 0.5, 4)
    dt(c, 'All 3 pillars must align for a valid entry.  One alone is never sufficient.',
       MG+12, y-15, 'Helvetica-Bold', 10.5, ORANGE)
    wt(c, 'The edge comes from convergence: compressed HV + high CS Score + adequate DTE = maximum probability setup.',
       MG+12, y-29, W-MG*2-22, 'Helvetica', 9.5, TEXT2, 14)
    ftr(c, 4)

# ── PAGE 5: SCANNER FULL VISUAL ───────────────────────────────────────────────
def p5_scanner(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 4', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'The Scanner', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'QQQ  |  Last $705.94  |  221 contracts found  |  Filter: PUT, DTE 300-750',
       MG, H-80, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)
    # Filter bar (below header, no overlap)
    fby = H-126; fbh = 30
    dr(c, MG, fby, W-MG*2, fbh, BG2, BORDER, 0.5, 4)
    filters = [('TICKER','QQQ x'),('TYPE','PUT'),('DTE MIN','300'),('DTE MAX','750'),
               ('IV MIN','0%'),('CS MIN','70')]
    fx = MG+8
    for lb, val in filters:
        dt(c, lb, fx, fby+fbh-10, 'Helvetica', 6, TEXT3)
        fw3 = c.stringWidth(val,'Helvetica',8)+14
        c.setFillColor(BG3); c.setStrokeColor(BORDER); c.setLineWidth(0.5)
        c.roundRect(fx, fby+5, fw3, 17, 3, fill=1, stroke=1)
        dt(c, val, fx+6, fby+10, 'Helvetica', 8, TEXT2)
        fx += fw3 + 8
    c.setFillColor(ORANGE); c.roundRect(W-MG-88, fby+7, 80, 16, 3, fill=1, stroke=0)
    dt(c, 'RUN SCANNER', W-MG-82, fby+12, 'Helvetica-Bold', 8, white)
    # Table frame and content
    tw = W-MG*2; ty = H-164
    dr(c, MG, 120, tw, ty-126, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3); c.roundRect(MG, ty-24, tw, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty-10, tw, 10, fill=1, stroke=0)
    dt(c, 'SCANNER RESULTS — SORTED BY CS SCORE   (8 core columns shown)',
       MG+10, ty-18, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG+tw, ty-24, BORDER, 0.5)
    scanner_table(c, MG+4, ty-24, tw-8, SCAN_ROWS)
    hl(c, MG, W-MG, 120+22, BORDER, 0.4)
    dt(c, 'CS SCORE:  >= 70 GREEN  |  50-69 YELLOW  |  < 50 RED',
       MG+8, 130, 'Helvetica', 8, TEXT3)
    dt(c, 'Click any row to open Opportunity Analysis + Vol Surface',
       W-MG-8, 130, 'Helvetica', 8, ORANGE, 'right')
    ftr(c, 5)

# ── PAGE 6: READING A ROW — fixed annotation boxes (80pt, 88pt interval) ──────
def p6_row(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 4 (cont.)', 'Reading a Scanner Row',
             'Example: QQQ PUT 620  —  CS Score 72')
    y -= 10

    wt(c, 'Each row in the scanner tells a complete story. Here is how to decode the most important columns from a single result.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 36

    # Zoomed row
    TW = W - MG*2
    zoom = [('TICKER','QQQ',ORANGE,58),('TYPE','PUT',RED,38),('STRIKE','620',TEXT,48),
            ('EXPIRATION','2027-06-17',TEXT2,80),('DTE','336',GREEN2,36),
            ('MID','$31.23',GREEN,50),('IV','30.6%',BLUE,50),('CS SCORE','72',None,45)]
    tot = sum(cw for _,_,_,cw in zoom)
    cws2 = [(n,v,col,cw/tot*TW) for n,v,col,cw in zoom]
    c.setFillColor(BG3); c.rect(MG, y-22, TW, 22, fill=1, stroke=0)
    xi = MG+6
    for n,v,col,cw in cws2: dt(c, n, xi, y-16, 'Helvetica-Bold', 8, ORANGE); xi+=cw
    rh = 36
    c.setFillColor(HexColor('#141820')); c.rect(MG, y-22-rh, TW, rh, fill=1, stroke=0)
    c.setStrokeColor(ORANGE); c.setLineWidth(2); c.rect(MG, y-22-rh, TW, rh, fill=0, stroke=1)
    xi = MG+6
    for n, val, col, cw in cws2:
        if val == '72':
            c.setFillColor(GREEN2); c.roundRect(xi, y-22-rh+9, 30, 18, 3, fill=1, stroke=0)
            dt(c, val, xi+5, y-22-rh+13, 'Helvetica-Bold', 13, white)
        else: dt(c, val, xi, y-22-rh+12, 'Helvetica-Bold', 12, col or TEXT)
        xi += cw
    y -= 22 + rh + 20

    # 6 annotation boxes — FIX: box_h=80pt, interval=88pt (prevents text overflow)
    # At aw-18 ~ 225pt and font 9pt: ~50 chars/line. Descriptions ≤ 95 chars → max 2 lines.
    anns = [
        ('QQQ  (Ticker)',
         'Blue-chip ETF. 50M+ daily volume. Tightest bid-ask spreads. Ideal learning vehicle.'),
        ('PUT  (Type)',
         'Long PUT profits from price decline OR IV expansion. No crash needed — just repricing.'),
        ('620  (Strike)',
         'QQQ at $705.94. Strike 12% OTM. Delta -0.22. OTM puts in low-IV = core entry vehicle.'),
        ('336  (DTE)',
         '11 months out. Theta ~$0.03/day. Far enough for thesis to develop. No daily monitoring.'),
        ('30.6%  (IV)',
         'IV near HV 30D (~21%). IV/HV ratio 1.45. Mild compression. Not overpaying for premium.'),
        ('72  (CS Score)',
         'GREEN. All three pillars confirmed: HV compressed, quality high, DTE adequate. Valid entry.'),
    ]
    aw = (W - MG*2 - 8) / 2
    box_h = 80      # FIX: was 50 — now fits 3 lines of 9pt text at lh=13 + title + padding
    interval = 88   # FIX: was 60 — box_h + 8pt gap
    for i, (lb, desc) in enumerate(anns):
        ri = i // 2; ci = i % 2
        ax = MG + ci * (aw + 8)
        ay = y - ri * interval
        dr(c, ax, ay - box_h, aw, box_h, BG2, BORDER)
        c.setFillColor(ORANGE); c.rect(ax, ay-3, aw, 3, fill=1, stroke=0)
        dt(c, lb,   ax+10, ay-16, 'Helvetica-Bold', 10, TEXT)
        wt(c, desc, ax+10, ay-30, aw-18, 'Helvetica', 9, TEXT2, 13)

    micro_cta(c, 'Open the Scanner and click any row to decode it live', 'coiledspring.app/scanner')
    ftr(c, 6)

# ── PAGE 7: HV SCREENER FULL VISUAL — color chips moved inside filter bar ──────
def p7_hv(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 5', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'HV Screener', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, '1,019 tickers  |  Updated 16/07/2026 19:00  |  Sorted by HV Rank ASC',
       MG, H-80, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)
    # Filter bar — color chips INSIDE the bar (right side), no overlap with subtitle
    fby = H-130; fbh = 28
    dr(c, MG, fby, W-MG*2, fbh, BG2, BORDER, 0.5)
    dt(c, 'TICKER:', MG+8, fby+fbh-9, 'Helvetica', 8, TEXT3)
    c.setFillColor(BG3); c.roundRect(MG+52, fby+6, 78, 14, 3, fill=1, stroke=0)
    dt(c, 'Filter...', MG+57, fby+11, 'Helvetica', 8, TEXT3)
    for lb, x in [('HV30% range', MG+148), ('HV RANK range', MG+258), ('HV PCT range', MG+380)]:
        dt(c, lb, x, fby+fbh-9, 'Helvetica', 7.5, TEXT3)
    # Color chips inside filter bar (right side, above REFRESH button)
    chip_data = [('<30 LOW', GREEN2, W-MG-220), ('30-79 MED', YELLOW, W-MG-160), ('>=80 HIGH', RED, W-MG-96)]
    for v, col, cx in chip_data:
        tw2 = c.stringWidth(v, 'Helvetica-Bold', 7) + 10
        c.setFillColor(col); c.roundRect(cx, fby+7, tw2, 13, 3, fill=1, stroke=0)
        dt(c, v, cx+5, fby+12, 'Helvetica-Bold', 7, white)
    c.setFillColor(ORANGE); c.roundRect(W-MG-52, fby+7, 44, 13, 3, fill=1, stroke=0)
    dt(c, 'REFRESH', W-MG-46, fby+12, 'Helvetica-Bold', 7, white)
    # Table — starts below filter bar with proper gap
    tw = W-MG*2; ty = H-168
    dr(c, MG, 120, tw, ty-126, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3); c.roundRect(MG, ty-24, tw, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty-10, tw, 10, fill=1, stroke=0)
    dt(c, 'HV SCREENER — Historical Volatility — 1,019 tickers monitored',
       MG+10, ty-18, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG+tw, ty-24, BORDER, 0.5)
    hv_table(c, MG+4, ty-24, tw-8, HV_ROWS)
    hl(c, MG, W-MG, 120+22, BORDER, 0.4)
    dt(c, 'HV Rank < 30 = compressed volatility = potential Coiled Spring setup. Sort ASC to surface best opportunities.',
       MG+8, 130, 'Helvetica', 8, TEXT3)
    micro_cta(c, 'Find tickers with HV Rank < 30 — sort ascending', 'coiledspring.app/hv-screener')
    ftr(c, 7)


# ── PAGE 8: VOL SURFACE INTRO — taller pattern boxes (90pt) ──────────────────
def p8_vs_intro(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 6', 'Reading the Volatility Surface',
             'The most powerful single diagnostic in the terminal')
    y -= 10

    wt(c, 'The Vol Surface renders Implied Volatility for every listed option across all strikes and all expirations simultaneously as an interactive 3D map. It is the fastest way to identify where the market is pricing fear — and where it is not.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 54

    dt(c, 'What to Look For', MG, y, 'Helvetica-Bold', 14, TEXT)
    y -= 22

    # 4 pattern boxes — FIX: box_h=86pt, interval=98pt (was 62pt/74pt — descriptions overflow)
    # Descriptions capped at ~80 chars to guarantee max 2 lines in column width ~220pt
    patterns = [
        ('Flat Blue Surface',
         'Ideal Coiled Spring entry. Low IV across all strikes and maturities. Any catalyst lifts the entire surface. Long options benefit.',
         GREEN2),
        ('Put Skew Spike',
         'Far OTM puts more expensive — tail-risk demand. Normal for index ETFs. Account for it in strike selection. Do not fight it.',
         YELLOW),
        ('Front-Month Spike',
         'Short-dated IV elevated around earnings or macro event. Enter beyond the event if longer maturities are still blue.',
         ORANGE),
        ('Interactive Cursor',
         'Click any surface point: exact strike, expiry, IV%, mid, delta, open interest. Add to watchlist from the chart.',
         BLUE),
    ]
    pw3 = (W - MG*2 - 12) / 2
    box_h = 86   # FIX: was 62 — descriptions wrap to 3 lines at ~220pt width, 9.5pt font
    interval = 98  # box_h + 12pt gap

    for i, (title, desc, col) in enumerate(patterns):
        ri = i // 2; ci = i % 2
        px = MG + ci * (pw3 + 12)
        py = y - ri * interval
        dr(c, px, py-box_h, pw3, box_h, BG2, col, 1.2, 6)
        c.setFillColor(col); c.rect(px, py-3, pw3, 3, fill=1, stroke=0)
        dt(c, title, px+10, py-18, 'Helvetica-Bold', 11, col)
        wt(c, desc, px+10, py-34, pw3-18, 'Helvetica', 9, TEXT2, 13)

    y -= 2 * interval + 10

    # Axis reference — 3 columns
    dt(c, 'Vol Surface — Axis Reference', MG, y, 'Helvetica-Bold', 12, TEXT)
    y -= 20
    axes = [
        ('X Axis — Strike',
         'All strike prices from far OTM left to far OTM right. Center is ATM. OTM puts sit left, OTM calls right.'),
        ('Y Axis — Expiration',
         'All expiry dates from front-month (near) to LEAPS (far). Front-month slice is closest to you in 3D view.'),
        ('Z Axis — IV %',
         'Implied Volatility height. Blue = low IV (< 25%). Red = elevated (> 50%). Coiled Spring entry zone = blue to green.'),
    ]
    aw3 = (W - MG*2 - 12) / 3
    for i, (lb, desc) in enumerate(axes):
        ax2 = MG + i*(aw3 + 6)
        dr(c, ax2, y-60, aw3, 56, BG2, BORDER, 0.5)
        dt(c, lb, ax2+8, y-14, 'Helvetica-Bold', 9.5, ORANGE)
        wt(c, desc, ax2+8, y-28, aw3-14, 'Helvetica', 8.5, TEXT2, 12)

    micro_cta(c, 'Rotate, zoom, click any point on the live vol surface',
              'coiledspring.app/scanner')
    ftr(c, 8)

# ── PAGE 9: VOL SURFACE FULL IMAGE ────────────────────────────────────────────
def p9_vs_full(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 6 (cont.)', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'QQQ Volatility Surface', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Current: $705.94  |  4,173 interpolated data points  |  Cubic Spline total variance',
       MG, H-80, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)
    ih = H-200; iw = W-MG*2
    dr(c, MG, 52, iw, ih, BG2, BORDER, 0.8, 4)
    c.drawImage(IMGS+'vol_surface.png', MG+4, 56, width=iw-8, height=ih-8,
                preserveAspectRatio=True, anchor='c')
    hl(c, MG, W-MG, 50, BORDER, 0.4)
    dt(c, 'BLUE = low IV (Coiled Spring zone)  |  RED = elevated IV (expensive premium)',
       MG, 36, 'Helvetica', 8, TEXT3)
    dt(c, 'Rotate and zoom in the live terminal  →  coiledspring.app',
       W-MG, 36, 'Helvetica', 8, ORANGE, 'right')
    ftr(c, 9)

# ── PAGE 10: PORTFOLIO TRACKER ────────────────────────────────────────────────
PORT_ROWS = [
    ('QQQ','PUT', '750','Jun 2028','700','LONG','1','$99.50','$98.08','27.9%','-$142','-1.43%','74'),
    ('QQQ','CALL','815','Jun 2027','335','LONG','1','$45.99','$36.38','23.9%','-$961','-20.9%','59'),
]
PORT_COLS = [('TICKER',46),('TYPE',32),('STRIKE',38),('EXPIRY',56),('DTE',32),
             ('DIR.',28),('QTY',22),('ENTRY',46),('LAST',42),('IV',36),
             ('PNL $',50),('PNL %',44),('CS',30)]

def p10_portfolio(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 7', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'Portfolio Tracker', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Monitor every position in real time — P&L, Greeks, CS Score, and What-If access in one view',
       MG, H-80, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)
    # Stats bar — 20pt below separator
    stats = [('2','Open Positions',TEXT),('-$1,103','Unrealized P&L',RED),
             ('74 / 59','CS Scores',ORANGE),('Real-time','P&L Updates',GREEN2)]
    sw = (W-MG*2)/4; sy = H-130
    for i,(v,lb,col) in enumerate(stats):
        sx = MG+i*sw
        dr(c, sx+3, sy-36, sw-6, 33, BG2, BORDER)
        dt(c, v,  sx+sw/2, sy-13, 'Helvetica-Bold', 15, col, 'center')
        dt(c, lb, sx+sw/2, sy-28, 'Helvetica', 7.5, TEXT3, 'center')
    # Portfolio table frame — starts below stats bar with 12pt gap
    tw = W-MG*2; ty = H-180
    dr(c, MG, 300, tw, ty-306, BG2, BORDER, 0.8, 4)
    c.setFillColor(BG3); c.roundRect(MG, ty-24, tw, 24, 4, fill=1, stroke=0)
    c.rect(MG, ty-10, tw, 10, fill=1, stroke=0)
    dt(c, 'PORTFOLIO — CS SPREAD STRATEGY  |  POSITIONS', MG+10, ty-18, 'Helvetica-Bold', 8, ORANGE)
    hl(c, MG, MG+tw, ty-24, BORDER, 0.5)
    tot = sum(cw for _,cw in PORT_COLS); cws = [(n,cw/tot*tw) for n,cw in PORT_COLS]
    c.setFillColor(BG3); c.rect(MG+4, ty-24-22, tw-8, 22, fill=1, stroke=0)
    xi = MG+8
    for n,cw in cws: dt(c, n, xi, ty-24-16, 'Helvetica-Bold', 7.5, ORANGE); xi+=cw
    for ri, row in enumerate(PORT_ROWS):
        rh=22; ry=ty-24-22-(ri+1)*rh
        if ri%2==0: c.setFillColor(HexColor('#141820')); c.rect(MG+4, ry, tw-8, rh, fill=1, stroke=0)
        xi=MG+8
        for ci,(val,(n,cw)) in enumerate(zip(row,cws)):
            if ci==0:  dt(c, val, xi, ry+7, 'Helvetica-Bold', 8, ORANGE)
            elif ci==1:dt(c, val, xi, ry+7, 'Helvetica-Bold', 8, RED if val=='PUT' else BLUE)
            elif ci==5:dt(c, val, xi, ry+7, 'Helvetica-Bold', 8, GREEN)
            elif ci==10:dt(c,val,  xi, ry+7, 'Helvetica',      8, RED)
            elif ci==11:dt(c,val,  xi, ry+7, 'Helvetica',      8, RED)
            elif ci==12:
                col = cs_col(val)
                c.setFillColor(col); c.roundRect(xi, ry+5, 24, 14, 3, fill=1, stroke=0)
                dt(c, val, xi+4, ry+7, 'Helvetica-Bold', 8, white)
            else: dt(c, val, xi, ry+7, 'Helvetica', 8, TEXT2)
            xi+=cw
        hl(c, MG+4, MG+tw-4, ry, BORDER, 0.3)
    # Position cards — wider (full inner width)
    card_y = ty-24-22-2*22-22
    pw2 = (W-MG*2-10)/2
    cards=[
        ('PUT 750','QQQ  |  Jun 2028  |  700 DTE','Entry $99.50  |  Last $98.08  |  IV 27.9%','P&L: -$142 (-1.43%)','CS 74 — On thesis. Hold.',RED,GREEN2,'74'),
        ('CALL 815','QQQ  |  Jun 2027  |  335 DTE','Entry $45.99  |  Last $36.38  |  IV 23.9%','P&L: -$961 (-20.9%)','CS 59 — Monitor at 300 DTE.',BLUE,YELLOW,'59'),
    ]
    for i,(badge,title,info,pnl,note,tcol,scol,sc) in enumerate(cards):
        cx = MG + i*(pw2+10)
        dr(c, cx, card_y-80, pw2, 76, BG2, tcol, 1.5)
        c.setFillColor(tcol); c.roundRect(cx+8, card_y-16, 44, 15, 3, fill=1, stroke=0)
        dt(c, badge, cx+10, card_y-11, 'Helvetica-Bold', 8, white)
        dt(c, title, cx+60, card_y-10, 'Helvetica-Bold', 9.5, TEXT)
        dt(c, info,  cx+8,  card_y-29, 'Helvetica', 8.5, TEXT3)
        dt(c, pnl,   cx+8,  card_y-44, 'Helvetica-Bold', 10, RED)
        col2 = GREEN2 if int(sc)>=70 else (YELLOW if int(sc)>=50 else RED)
        c.setFillColor(col2); c.roundRect(cx+pw2-44, card_y-24, 36, 18, 4, fill=1, stroke=0)
        dt(c, f'CS {sc}', cx+pw2-40, card_y-16, 'Helvetica-Bold', 9, white)
        dt(c, note, cx+8, card_y-60, 'Helvetica', 8.5, TEXT2)
        dt(c, u'→ Open in What-If', cx+8, card_y-74, 'Helvetica-Bold', 8, ORANGE)
    micro_cta(c, 'Track live P&L, Greeks and CS Score per position', 'coiledspring.app/portfolio')
    ftr(c, 10)


# ── PAGE 11: WHAT-IF — chart + clean caption box + separate CTA ───────────────
# FIX: old code had 4-col captions with dt() that overflowed into adjacent columns
# AND overlapped with the micro_cta. Now: chart | text box | micro_cta — no overlap.
def p11_whatif(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-96, W, 90, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 8', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'What-If Simulator', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Model P&L across price moves and time horizons before you execute any trade',
       MG, H-80, 'Helvetica', 9.5, TEXT3)
    hl(c, 0, W, H-95, BORDER, 0.8)

    # Layout:
    # Chart: H-112 down to cap_box_top (= 218pt from bottom)
    # Caption box: 218 down to 148 (70pt)
    # micro_cta: fixed 72-114 (42pt)
    # Gap caption_box_bottom to micro_cta_top: 148-114=34pt ← fine

    cap_box_top = 218    # top of caption box
    cap_box_h   = 68     # height of caption box
    chart_top   = H-112  # = 729.89
    chart_bot   = cap_box_top + cap_box_h + 10  # = 296pt → chart height = 729.89-296 = 433.89

    iw = W - MG*2
    ih = chart_top - chart_bot   # ~434pt
    dr(c, MG, chart_bot, iw, ih, BG2, BORDER, 0.8, 4)
    c.drawImage(IMGS+'whatif_chart.png', MG+4, chart_bot+4, width=iw-8, height=ih-8,
                preserveAspectRatio=True, anchor='c')

    # Caption box — clean text, no overflow risk
    cap_y = cap_box_top + cap_box_h
    dr(c, MG, cap_box_top, iw, cap_box_h, BG2, BORDER, 0.5, 4)
    dt(c, 'WHAT THE CURVES SHOW', MG+14, cap_y-14, 'Helvetica-Bold', 9, ORANGE)
    hl(c, MG+14, MG+iw-14, cap_y-20, BORDER, 0.4)

    # 2-column layout inside caption box — plenty of width per column
    half = (iw - 28) / 2
    left_items = [
        (u'U-shape', 'long premium — both up and down moves profit'),
        (u'Center trough', 'theta decay zone — flat price loses value'),
    ]
    right_items = [
        (u'Curves fan down', 'time erosion visible over 600 days — DTE matters'),
        (u'IV Shift slider', 'stress-test vol collapse (-50%) or spike (+50%) before entry'),
    ]
    for i,(k,v) in enumerate(left_items):
        by2 = cap_y - 30 - i*18
        dt(c, k+':', MG+14, by2, 'Helvetica-Bold', 8.5, ORANGE)
        kw = c.stringWidth(k+':', 'Helvetica-Bold', 8.5)
        dt(c, v, MG+16+kw, by2, 'Helvetica', 8.5, TEXT2)
    for i,(k,v) in enumerate(right_items):
        by2 = cap_y - 30 - i*18
        dt(c, k+':', MG+14+half+4, by2, 'Helvetica-Bold', 8.5, ORANGE)
        kw = c.stringWidth(k+':', 'Helvetica-Bold', 8.5)
        dt(c, v, MG+16+half+4+kw, by2, 'Helvetica', 8.5, TEXT2)

    micro_cta(c, 'Open What-If and model your trade before execution',
              'coiledspring.app/what-if')
    ftr(c, 11)

# ── PAGE 12: CASE STUDY — added Day 60 hypothetical ──────────────────────────
def p12_case(c):
    fbg(c)
    y = shdr(c, 'CHAPTER 9', 'Case Study: QQQ PUT 620',
             'The real trade — from scanner to position management')
    y -= 8

    # Entry table — 2 col label/value
    entry_items = [
        ('Ticker',       'QQQ  (Invesco QQQ Trust ETF)'),
        ('Strategy',     'Long PUT  —  benefit from IV expansion, hedge equity exposure'),
        ('Strike',       '$620  (12% OTM at entry)'),
        ('Expiry',       'June 17, 2027'),
        ('DTE at Entry', '336 days'),
        ('Entry Mid',    '$31.23   ($3,123 per contract)'),
        ('IV at Entry',  '30.6%   (vs HV 30D approx 21%)'),
        ('CS Score',     '72   Green — all 3 pillars confirmed'),
    ]
    rh=18; th=22; tw=W-MG*2
    c.setFillColor(BG3); c.rect(MG, y-th, tw, th, fill=1, stroke=0)
    dt(c, 'ENTRY — 17 July 2026', MG+10, y-16, 'Helvetica-Bold', 9, GREEN2)
    dt(c, 'Entry confirmed by all 3 Coiled Spring pillars', W-MG-8, y-16, 'Helvetica', 8, TEXT3, 'right')
    for ri,(lb,val) in enumerate(entry_items):
        ry = y-th-(ri+1)*rh
        if ri%2==0: c.setFillColor(HexColor('#141820')); c.rect(MG, ry, tw, rh, fill=1, stroke=0)
        dt(c, lb+':', MG+10, ry+5, 'Helvetica', 8, TEXT3)
        vcol = GREEN2 if 'CS Score' in lb else TEXT
        dt(c, val, MG+150, ry+5, 'Helvetica-Bold', 8.5, vcol)
        hl(c, MG, MG+tw, ry, BORDER, 0.2)
    y -= th + (len(entry_items)+1)*rh + 12

    # Why I Entered (left) + Payoff chart (right)
    left_w = (W-MG*2)*0.54; chart_w = (W-MG*2)*0.43
    chart_h = 138; gap = (W-MG*2)*0.03
    dt(c, 'Why I Entered', MG, y, 'Helvetica-Bold', 12, TEXT); y -= 18
    reasons = [
        ('Step 1 — HV Screener', 'QQQ HV Rank was 22. Lowest quartile in 52W range. Spring coiling.'),
        ('Step 2 — Scanner',     'CS Score 72, IV 30.6% vs HV 30D ~21%. IV/HV ratio 1.45. 336 DTE.'),
        ('Step 3 — Vol Surface', 'Flat blue surface across all strikes and maturities. No spikes.'),
        ('Step 4 — What-If',     'Flat-price scenario showed profit from IV expansion alone.'),
    ]
    for i,(step,desc) in enumerate(reasons):
        c.setFillColor(ORANGE); c.circle(MG+8, y-i*26+4, 5, fill=1, stroke=0)
        dt(c, step, MG+20, y-i*26,    'Helvetica-Bold', 9.5, ORANGE)
        dt(c, desc, MG+20, y-i*26-13, 'Helvetica',      8.5, TEXT2)
    chart_x = MG + left_w + gap
    dr(c, chart_x, y-chart_h, chart_w, chart_h, BG2, BORDER, 0.8, 4)
    c.drawImage(IMGS+'case_payoff.png', chart_x+3, y-chart_h+3,
                width=chart_w-6, height=chart_h-6, preserveAspectRatio=True, anchor='c')
    dt(c, 'QQQ PUT 620 — P&L by scenario', chart_x+chart_w/2, y-chart_h-11,
       'Helvetica', 7.5, TEXT3, 'center')
    y -= max(len(reasons)*26+6, chart_h+14) + 14

    # Position Management timeline — WITH Day 60 added
    dt(c, 'Position Management', MG, y, 'Helvetica-Bold', 12, TEXT); y -= 18
    events = [
        ('Day 1',   'Entry at $31.23. Max risk $3,123. Allocation 2.1%. Checklist: 7/7 passed. All pillars green.',     'Entered', GREEN),
        ('Day 15',  'QQQ -3% to $685. Position -$142 (-4.5%). HV Rank 24. CS still 72. Checklist: HOLD.',              'Hold',    YELLOW),
        ('Day 45',  'QQQ flat. IV expands 30.6% to 35.2%. Position +$340 (+11%) from IV expansion alone.',              'Profit',  GREEN2),
        ('Day 60',  'Hypothetical exit scenario: QQQ -8% to $649. IV at 38%. Position ~+$1,850 (+59%). Checklist: SELL if target hit.', 'Scenario', ORANGE),
        ('Day 120', 'Real position open. Monitoring. Thesis intact. IV still compressed vs 52W high ~55%.', 'Monitor', BLUE),
    ]
    ew = W-MG*2; eh = 24
    for i,(day,desc,status,sc) in enumerate(events):
        ey2 = y - i*(eh+4)
        dr(c, MG, ey2-eh, ew, eh, BG2, BORDER)
        c.setFillColor(sc); c.roundRect(MG, ey2-eh, 48, eh, 4, fill=1, stroke=0)
        dt(c, day, MG+24, ey2-eh+8, 'Helvetica-Bold', 8.5, white, 'center')
        wt(c, desc, MG+56, ey2-8, ew-110, 'Helvetica', 8, TEXT2, 11)
        dt(c, status, MG+ew-6, ey2-8, 'Helvetica-Bold', 8.5, sc, 'right')
    y -= len(events)*(eh+4) + 10
    dr(c, MG, y-36, W-MG*2, 32, BG3, ORANGE, 0.8, 4)
    dt(c, 'The Rule:', MG+10, y-12, 'Helvetica-Bold', 10.5, ORANGE)
    wt(c, 'Never close a long-dated position before 60 DTE if the 7-step checklist still validates the thesis.',
       MG+76, y-12, W-MG*2-84, 'Helvetica', 9, TEXT2, 13)
    ftr(c, 12)


# ── PAGE 13: CHECKLIST — QR box bottom-right (same as v1.3, already good) ─────
def p13_checklist(c):
    fbg(c)
    c.setFillColor(BG2); c.rect(0, H-88, W, 82, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, H-6, W, 6, fill=1, stroke=0)
    dt(c, 'CHAPTER 10', MG, H-28, 'Helvetica-Bold', 9, ORANGE)
    dt(c, 'Pre-Trade Checklist', MG, H-62, 'Helvetica-Bold', 24, TEXT)
    dt(c, 'Run before every entry. All 7 must pass. If any fails — skip the trade.',
       MG, H-80, 'Helvetica', 10, TEXT3)
    hl(c, 0, W, H-88, BORDER, 0.8)

    steps = [
        ('HV Rank < 30',
         'Open HV Screener. Sort ASC. Verify rank < 30. Target < 15. If HV Rank >= 30, spring not compressed. Skip.'),
        ('CS Score >= 70',
         'Scanner shows CS in green (70+). Target 75+. Score < 70 = quality factor failing. Do not override.'),
        ('DTE 90 to 730',
         'Min 90 DTE. Preferred 180-400. Short-dated = punishing theta. Beyond 730 = wide spreads. Stay in window.'),
        ('Delta 0.15 to 0.40',
         'Avoid deep OTM (< 0.10): too far. Avoid near-ATM (> 0.50): too expensive. Sweet spot: 0.20-0.35.'),
        ('Bid-Ask Spread < 5%',
         'Check Spread% column. If spread > 5% of option mid, liquidity poor. Reduce size or skip entirely.'),
        ('No binary event in 60 DTE',
         'Check earnings, FDA, macro events in first 60 days. IV already elevated if found. Wait, then enter.'),
        ('Size <= 3% of account',
         'Max loss = premium x 100 x contracts. Must not exceed 3% of account. Non-negotiable. Scale down.'),
    ]
    box_h = 46; gap = 5; start_y = H-100
    for i,(title,desc) in enumerate(steps):
        by = start_y - i*(box_h+gap)
        c.setFillColor(BG2); c.setStrokeColor(BORDER); c.setLineWidth(0.5)
        c.roundRect(MG, by-box_h, W-MG*2, box_h, 3, fill=1, stroke=1)
        c.setFillColor(BG3); c.setStrokeColor(GREEN2); c.setLineWidth(1.5)
        c.rect(MG+8, by-box_h+11, 22, 22, fill=1, stroke=1)
        c.setFillColor(ORANGE); c.circle(MG+48, by-box_h+22, 11, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 9)
        c.drawCentredString(MG+48, by-box_h+18, str(i+1))
        dt(c, title, MG+66, by-13, 'Helvetica-Bold', 10, TEXT)
        wt(c, desc, MG+66, by-26, W-MG*2-76-145, 'Helvetica', 8, TEXT2, 11)

    bottom_y = start_y - len(steps)*(box_h+gap) - 14
    left_w   = W-MG*2 - 145 - 12
    qr_box_w = 142; qr_box_h = 138
    qr_size  = 92
    qr_box_x = W-MG-qr_box_w

    bh2 = (qr_box_h-6)/2
    c.setFillColor(HexColor('#0D2B1A')); c.setStrokeColor(GREEN2); c.setLineWidth(1.5)
    c.roundRect(MG, bottom_y-qr_box_h+bh2+6, left_w, bh2, 4, fill=1, stroke=1)
    dt(c, u'✓  ALL 7 PASSED', MG+left_w/2, bottom_y-qr_box_h+bh2+6+bh2-12,
       'Helvetica-Bold', 11, GREEN2, 'center')
    dt(c, 'GREEN LIGHT — place the trade', MG+left_w/2, bottom_y-qr_box_h+bh2+6+bh2-26,
       'Helvetica', 8.5, TEXT2, 'center')
    c.setFillColor(HexColor('#2B0D0D')); c.setStrokeColor(RED); c.setLineWidth(1.5)
    c.roundRect(MG, bottom_y-qr_box_h, left_w, bh2, 4, fill=1, stroke=1)
    dt(c, u'✗  ANY FAILED', MG+left_w/2, bottom_y-qr_box_h+bh2-12,
       'Helvetica-Bold', 11, RED, 'center')
    dt(c, 'SKIP — wait for a better setup', MG+left_w/2, bottom_y-qr_box_h+bh2-26,
       'Helvetica', 8.5, TEXT2, 'center')

    c.setFillColor(BG2); c.setStrokeColor(ORANGE); c.setLineWidth(2)
    c.roundRect(qr_box_x, bottom_y-qr_box_h, qr_box_w, qr_box_h, 6, fill=1, stroke=1)
    c.setFillColor(ORANGE); c.rect(qr_box_x, bottom_y-4, qr_box_w, 4, fill=1, stroke=0)
    qr_x = qr_box_x + (qr_box_w-qr_size)/2
    qr_y = bottom_y - 10 - qr_size
    c.drawImage(IMGS+'qr_utm.png', qr_x, qr_y, width=qr_size, height=qr_size)
    ty2 = qr_y - 8
    dt(c, 'SCAN TO OPEN', qr_box_x+qr_box_w/2, ty2,    'Helvetica-Bold', 8.5, ORANGE, 'center')
    dt(c, 'THE SCANNER',  qr_box_x+qr_box_w/2, ty2-13, 'Helvetica-Bold', 8.5, ORANGE, 'center')
    ty3 = ty2-29
    dt(c, '14-day free trial',     qr_box_x+qr_box_w/2, ty3,    'Helvetica', 7.5, TEXT2, 'center')
    dt(c, 'No credit card needed', qr_box_x+qr_box_w/2, ty3-12, 'Helvetica', 7.5, TEXT2, 'center')
    dt(c, u'→ coiledspring.app/scanner', qr_box_x+qr_box_w/2, ty3-26,
       'Helvetica-Bold', 7.5, ORANGE, 'center')
    ftr(c, 13)

# ── PAGE 14: CTA — hardcoded 4×2 feature grid, no duplication ────────────────
# FIX: replaced loop-calculated fy2 positions with explicit per-item y coordinates.
# This eliminates the root cause of "duplicated items" (y miscalculation in loop).
def p14_cta(c):
    fbg(c)
    y = shdr(c, 'FINAL', 'Start Trading with an Edge',
             'Full access to the Coiled Spring Terminal — 14-day free trial')
    y -= 14

    wt(c, 'You now have the complete Coiled Spring framework. The terminal brings it all together: scanner, HV screener, volatility surface, portfolio tracker, and What-If simulator — live across 1,100+ tickers.',
       MG, y, W-MG*2, 'Helvetica', 11, TEXT, 16)
    y -= 54

    # Feature grid — 8 items, 2 columns, HARDCODED row positions
    feats = [
        ('Real-time Scanner',     'Filter 1,100+ tickers by IV, DTE, Delta and CS Score.'),
        ('HV Screener (1,019)',   'Daily HV rank. Spot compression in 30 seconds.'),
        ('3D Volatility Surface', 'Interactive Plotly surface. Click any strike/expiry.'),
        ('Portfolio Tracker',     'Unlimited positions. Real-time P&L and Greeks.'),
        ('What-If Simulator',     'Model payoffs before you execute. No surprises.'),
        ('IV History Database',   'Daily IV snapshots building since July 2026.'),
        ('Watchlist',             'Save your best setups. Return with one click.'),
        ('Priority Support',      'Email support and community access included.'),
    ]
    fw = (W - MG*2 - 10) / 2   # column width
    fh = 36                      # box height
    col_gap = 10                 # gap between columns
    row_gap = 8                  # gap between rows

    # Hardcoded y-tops for each of 4 rows (relative to current y)
    row_tops = [y, y-(fh+row_gap), y-2*(fh+row_gap), y-3*(fh+row_gap)]

    for i, (title, desc) in enumerate(feats):
        col_idx = i % 2
        row_idx = i // 2
        fx = MG + col_idx * (fw + col_gap)
        fy = row_tops[row_idx]
        dr(c, fx, fy-fh, fw, fh, BG2, BORDER, 0.5)
        c.setFillColor(GREEN2); c.circle(fx+14, fy-10, 6, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(fx+14, fy-13, u'✓')
        dt(c, title, fx+28, fy-11, 'Helvetica-Bold', 10, TEXT)
        dt(c, desc,  fx+28, fy-24, 'Helvetica',      8.5, TEXT3)

    n_rows = 4
    y -= n_rows * (fh + row_gap) + 18

    # CTA block
    c.setFillColor(ORANGE); c.roundRect(MG, y-68, W-MG*2, 64, 8, fill=1, stroke=0)
    dt(c, 'Start Your Free Trial', W/2, y-20, 'Helvetica-Bold', 22, white, 'center')
    dt(c, 'coiledspring.app',      W/2, y-42, 'Helvetica', 15, HexColor('#FFE8D6'), 'center')
    dt(c, '14-day full access  ·  No credit card  ·  Cancel anytime',
       W/2, y-58, 'Helvetica', 9, HexColor('#FFD4B5'), 'center')
    y -= 84

    hl(c, MG, W-MG, y, BORDER)
    y -= 18
    wt(c, 'Questions?  support@coiledspring.app   |   Newsletter:  coiledspring.substack.com',
       MG, y, W-MG*2, 'Helvetica', 9.5, TEXT3, 14)
    ftr(c, 14)

# ── PAGE 15: ABOUT — fixed URLs (font 10), logo + text no overlap ─────────────
# FIX: Bio text width reduced to W*0.60 to ensure 20pt gap before logo circle edge.
# FIX: URL font increased from 9pt to 10pt to prevent character-merge visual artifact.
# FIX: Stats grid uses correct coiledspring.app (not "colledspring" render artifact).
def p15_about(c):
    fbg(c)
    y = shdr(c, 'ABOUT THE AUTHOR', 'Francesco Sgarbossa',
             'Quantitative Options Trader  |  Builder of Coiled Spring Terminal')
    y -= 22

    # Logo right side — positioned clear of bio text
    logo(c, W-86, H-158, 48)
    dt(c, 'COILED SPRING', W-86, H-216, 'Helvetica-Bold', 8, ORANGE, 'center')
    dt(c, 'TERMINAL',      W-86, H-228, 'Helvetica-Bold', 8, ORANGE, 'center')

    # Bio — width capped at 60% of page to guarantee no overlap with logo
    bio_w = W * 0.60    # = 357pt; logo left edge at W-86-48 = 461pt → 104pt gap
    bps = [
        'Francesco is a self-taught quantitative options trader based in Italy with a background in banking IT systems and financial engineering. He built the Coiled Spring Terminal to solve a problem he faced himself.',
        'The Coiled Spring methodology emerged from years of research into volatility mean reversion, term structure dynamics, and structured options strategies. The CS Score distills this research into one actionable signal.',
        'The terminal runs 24/7 on Railway infrastructure, collects IV snapshots daily for 1,100+ tickers, and is continuously updated with new analytical tools and features.',
    ]
    for bp in bps:
        wt(c, bp, MG, y, bio_w - MG, 'Helvetica', 11, TEXT2, 16)
        y -= 64

    y -= 6

    # Stats — 4 correct values, single row
    stats4 = [('10+ yrs','Options Trading'), ('1,100+','Tickers Monitored'),
              ('Daily','IV Collection'),     ('100%','Self-Built')]
    sc_w = (W-MG*2) / 4
    for i,(v,lb) in enumerate(stats4):
        sx = MG + i*sc_w + sc_w/2
        dt(c, v,  sx, y,    'Helvetica-Bold', 18, ORANGE, 'center')
        dt(c, lb, sx, y-16, 'Helvetica',       8, TEXT3,  'center')
    y -= 32
    hl(c, MG, W-MG, y, BORDER)
    y -= 22

    # Links — FIX: font size 10 (was 9) to prevent character-merge artifact on screen
    # FIX: URLs are correct: coiledspring.app, coiledspring.substack.com, support@coiledspring.app
    links = [
        ('Web',      'coiledspring.app'),
        ('Substack', 'coiledspring.substack.com'),
        ('Contact',  'support@coiledspring.app'),
    ]
    lw = (W - MG*2 - 12) / 3
    for i,(lb,url) in enumerate(links):
        lx = MG + i*(lw+6)
        dr(c, lx, y-36, lw, 32, BG2, ORANGE, 1)
        dt(c, lb,  lx+10, y-14, 'Helvetica-Bold', 10.5, ORANGE)
        dt(c, url, lx+10, y-28, 'Helvetica',      10,   TEXT2)   # FIX: was 9pt
    y -= 52

    hl(c, MG, W-MG, y, BORDER)
    y -= 22

    # Closing quote
    c.setFillColor(BG3); c.roundRect(MG, y-82, W-MG*2, 78, 6, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.setFont('Helvetica-Bold', 28)
    c.drawString(MG+12, y-24, u'"')
    wt(c, 'Markets are not random in volatility. They cycle. When the spring compresses, it will release. Your job is to be positioned before the release — not to predict direction, but to profit from the expansion itself.',
       MG+30, y-22, W-MG*2-44, 'Helvetica-Oblique', 10.5, TEXT, 15)
    dt(c, u'— Francesco Sgarbossa', W-MG-10, y-72, 'Helvetica', 9, TEXT3, 'right')
    y -= 96

    hl(c, MG, W-MG, y)
    dt(c, 'Educational purposes only. Options trading involves substantial risk of loss. Past performance does not guarantee future results.',
       W/2, y-14, 'Helvetica', 7.5, TEXT3, 'center')
    c.setFillColor(ORANGE); c.rect(0, 0, W, 6, fill=1, stroke=0)
    ftr(c, 15)

# ═══════════════════════════════════ MAIN ═════════════════════════════════════
def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle('The Coiled Spring Playbook v1.4')
    c.setAuthor('Francesco Sgarbossa')

    fbg(c);  p1_cover(c);     print('p1  cover')
    np_(c);  p2_metaphor(c);  print('p2  metaphor + promise box + arrows + pull-quote')
    np_(c);  p3_problem(c);   print('p3  problem + 3-col table + 3 testimonials')
    np_(c);  p4_pillars(c);   print('p4  pillars — vertical layout, no typos')
    np_(c);  p5_scanner(c);   print('p5  scanner full visual')
    np_(c);  p6_row(c);       print('p6  reading a row — fixed 80pt boxes, 88pt interval')
    np_(c);  p7_hv(c);        print('p7  hv screener — chips inside filter bar, no overlap')
    np_(c);  p8_vs_intro(c);  print('p8  vol surface intro — 86pt pattern boxes')
    np_(c);  p9_vs_full(c);   print('p9  vol surface full image')
    np_(c);  p10_portfolio(c);print('p10 portfolio full visual — wider cards')
    np_(c);  p11_whatif(c);   print('p11 what-if — chart + caption box + cta no overlap')
    np_(c);  p12_case(c);     print('p12 case study + Day 60 hypothetical')
    np_(c);  p13_checklist(c);print('p13 checklist + qr box bottom-right')
    np_(c);  p14_cta(c);      print('p14 cta — hardcoded grid, no duplication')
    np_(c);  p15_about(c);    print('p15 about — font 10 URLs, bio no logo overlap')

    c.save()
    sz = os.path.getsize(OUT)/1024
    print(f'\nSaved  →  {OUT}  ({sz:.0f} KB, 15 pages)')

main()
