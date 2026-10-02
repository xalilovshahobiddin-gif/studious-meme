#!/usr/bin/env python3
"""25 ta boʻri turi uchun avatar (SVG) yaratish.

Ishlatish: python3 tools/gen_wolf_avatars.py
Natija:   public/assets/wolves/<daraja>.svg  va  public/assets/wolves.js (demo uchun, data URI)

Har bir avatar bitta parametrli boʻri boshidan chiziladi (GDD bo'lim 23: "bitta boʻri silueti").
Turga moslik: moʻyna ranglari, quloq/tumshuq/yonoq shakli, dogʻlar, koʻz rangi va yashash muhiti foni.
Toifa ramkasi: haqiqiy — kumush, qadimgi — muz/suyak, mifologik — oltin.
"""
import json
import math
import os
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "assets", "wolves")

# Asosiy shakl (viewBox 0 0 128 128). Har bir tur faqat farqli qiymatlarini beradi.
BASE = dict(
    s=1.0,            # bosh oʻlchami
    earH=20, earX=22, earW=1.0,   # quloq balandligi, uchining markazdan uzoqligi, kengligi
    skullW=22, cheekW=33, jawW=20,  # bosh, yonoq (yol), jagʻ kengligi
    ruffN=6, ruffLen=5,           # yonoq junlari: tishlar soni va uzunligi
    muzL=22, muzW=9,              # tumshuq uzunligi va kengligi
    eye="#d9a032", nose="#1b1714",
    marks=None,                   # qoʻshimcha dogʻlar: "stripe", "lips", "mottled", "brows"
    habitat="forest", extra=None, cls="real",
)

# fur — asosiy moʻyna, dark — tepa/orqa, light — yonoq va tomoq, muzzle — tumshuq
SPECIES = {
    1:  dict(fur="#8d7a62", dark="#5e5040", light="#dccbb0", muzzle="#c9b597", s=0.86, earH=16, earX=20,
             bg=("#3f6b4c", "#13261a"), habitat="forest"),                       # Honsyu — kichik, oʻrmon
    2:  dict(fur="#c8642a", dark="#8a3d17", light="#f6efe2", muzzle="#e9c49c", earH=27, earX=25, earW=0.9,
             skullW=19, cheekW=27, jawW=15, muzL=29, muzW=7, ruffLen=3, s=0.9,
             bg=("#7d9a52", "#26351a"), habitat="mountain"),                     # Efiopiya — qizil, uzun tumshuq
    3:  dict(fur="#cdb48a", dark="#957b54", light="#f1e6cf", muzzle="#e3d1ae", earH=29, earX=30, earW=1.25,
             skullW=19, cheekW=27, jawW=16, ruffLen=3, muzW=8, s=0.88,
             bg=("#e3b56b", "#7a4b1f"), habitat="desert"),                       # Arab — katta quloq, choʻl
    4:  dict(fur="#ab865b", dark="#6e5236", light="#e8d6b6", muzzle="#d7bf98", earH=23, earX=24,
             cheekW=30, s=0.9, bg=("#cf9d50", "#583c18"), habitat="steppe"),     # Hind — sargʻish
    5:  dict(fur="#a95b33", dark="#4f4540", light="#ead9c1", muzzle="#d9a77c", earH=24, earX=24,
             cheekW=30, marks="brows", s=0.93, bg=("#4b6b45", "#1a2a18"), habitat="swamp"),  # Qizil boʻri
    6:  dict(fur="#8e7a64", dark="#43382d", light="#e4d6c2", muzzle="#cdb99e", marks="stripe",
             s=0.94, bg=("#6c8aa0", "#24323d"), habitat="mountain"),             # Italyan — Apenninlar
    7:  dict(fur="#8a7464", dark="#3b302a", light="#e3d2bd", muzzle="#c79f78", marks="mottled",
             s=0.95, bg=("#c88a58", "#4d3220"), habitat="desert"),               # Meksika — ola, zang rang
    8:  dict(fur="#9b6f4b", dark="#4d3a2b", light="#e6d5bf", muzzle="#c8a27c", marks="brows",
             s=0.96, bg=("#9a6b2e", "#2d2312"), habitat="forest"),               # Sharqiy — kuzgi oʻrmon
    9:  dict(fur="#8b7258", dark="#3a2c22", light="#f1e7d8", muzzle="#bfa587", marks="lips",
             s=0.97, bg=("#9c9c58", "#3a3a1f"), habitat="steppe"),               # Iberiya — oq lab, qora chiziq
    10: dict(fur="#bba27a", dark="#7d6a4c", light="#eee2ca", muzzle="#dcc7a4", ruffLen=4, ruffN=8,
             s=0.98, bg=("#dcb95e", "#6b5220"), habitat="steppe"),               # Dasht — rangpar, oltin dasht
    11: dict(fur="#ab9c88", dark="#6e6354", light="#eee6d9", muzzle="#d6c8b3", ruffLen=9, ruffN=9,
             cheekW=36, s=0.98, bg=("#a9bfd2", "#3b4b5c"), habitat="snow"),      # Himolay — qalin jun, togʻ
    12: dict(fur="#8f8578", dark="#4f4a43", light="#ddd5c9", muzzle="#c4b9aa", s=1.0,
             bg=("#5f8070", "#1e2e27"), habitat="forest"),                       # Ezo — Xokkaydo
    13: dict(fur="#c9baa2", dark="#8a7b66", light="#f3ece0", muzzle="#e1d4bf", ruffLen=10, ruffN=10,
             cheekW=37, earH=18, s=1.0, bg=("#bcab8a", "#4a4030"), habitat="mountain"),  # Tibet — juda junli
    14: dict(fur="#f1f1ed", dark="#c4cad1", light="#ffffff", muzzle="#f7f6f2", earH=15, earX=20,
             ruffLen=8, ruffN=9, cheekW=35, eye="#c79530", s=1.0,
             bg=("#d3e9f7", "#5f86a6"), habitat="snow"),                         # Arktika — oq, kalta quloq
    15: dict(fur="#d0c9bc", dark="#8e877c", light="#f4f0e9", muzzle="#e3dccf", s=1.02,
             bg=("#c9b26a", "#4d4321"), habitat="steppe"),                       # Buyuk tekislik — preriya
    16: dict(fur="#8f8d88", dark="#4c4a47", light="#ebe4d8", muzzle="#d2c8b6", marks="brows",
             s=1.03, bg=("#4b6654", "#18241c"), habitat="forest"),               # Yevroosiyo kulrang — tayga
    17: dict(fur="#dad7d0", dark="#a09a90", light="#fbf9f5", muzzle="#ece8e0", ruffLen=9, ruffN=9,
             cheekW=36, s=1.04, bg=("#afc6ba", "#3c5047"), habitat="snow"),      # Tundra
    18: dict(fur="#4b4b50", dark="#252528", light="#a39e96", muzzle="#7b7772", eye="#e0a73a",
             s=1.05, cheekW=35, bg=("#34506a", "#0f1a24"), habitat="forest"),    # Alyaska — qoramtir
    19: dict(fur="#2b2b2f", dark="#141416", light="#77777d", muzzle="#55555b", eye="#e8b23e",
             s=1.08, skullW=24, cheekW=37, jawW=23, bg=("#42607a", "#121e2a"), habitat="mountain"),  # Makkenzi — qora, yirik
    20: dict(fur="#7a6a58", dark="#3e342a", light="#cbbda7", muzzle="#a8977f", skullW=25, cheekW=37,
             jawW=25, muzW=11, muzL=20, s=1.08, cls="ancient", bg=("#98d0ec", "#24506e"),
             habitat="ice", extra="ice"),                                         # Beringiya — muzlik davri
    21: dict(fur="#5b4636", dark="#2c2119", light="#ab9175", muzzle="#8a7259", skullW=27, cheekW=39,
             jawW=27, muzW=12, muzL=19, earH=15, earX=21, s=1.1, cls="ancient", eye="#d08a2a",
             bg=("#8a6340", "#2a1a10"), habitat="tar", extra="bones"),           # Dahshatli boʻri
    22: dict(fur="#e9eef3", dark="#9fb3c4", light="#ffffff", muzzle="#f2f6fa", eye="#7fe3ff",
             nose="#26313d", ruffLen=10, ruffN=10, cheekW=38, s=1.1, cls="myth",
             bg=("#12305a", "#050b1a"), habitat="snow", extra="aurora"),          # Amarok — oq ruh boʻri
    23: dict(fur="#6d7178", dark="#33363b", light="#c5c9ce", muzzle="#9ea3a9", eye="#f3c04a",
             s=0.74, cls="myth", bg=("#2c3350", "#0b0e1a"), habitat="mountain", extra="twin"),  # Geri va Freki
    24: dict(fur="#1f1f24", dark="#0a0a0d", light="#4d4d56", muzzle="#3a3a42", eye="#ff3b2f",
             nose="#000000", skullW=26, cheekW=39, jawW=26, ruffLen=9, ruffN=9, muzW=11, s=1.12,
             cls="myth", bg=("#8a2410", "#180503"), habitat="fire", extra="chain"),  # Fenrir — zanjirli
    25: dict(fur="#4677dd", dark="#1f3f8f", light="#c5dcff", muzzle="#9dbcf2", eye="#ffd24a",
             nose="#0d1a3d", ruffLen=8, ruffN=9, cheekW=36, s=1.08, cls="myth",
             bg=("#2346a0", "#050b26"), habitat="sky", extra="stars"),            # Koʻk Boʻri — osmon
}

RING = {"real": ("#9fb2d4", 2.5), "ancient": ("#a8e6ff", 3.5), "myth": ("#f5c04a", 4)}


def f(x):
    return f"{x:.1f}".rstrip("0").rstrip(".")


def mirror(pts):
    return [(128 - x, y) for x, y in pts]


def poly(pts):
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + "Z"


def bezier(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3))


def head_outline(p):
    """Bosh silueti: quloqlar + tishli yonoq juni (yol) + jagʻ."""
    c = 64
    ew = 9 * p["earW"]
    left = [(c, 40), (c - ew, 39), (c - p["earX"], 39 - p["earH"]), (c - p["skullW"], 51)]
    a, b = (c - p["skullW"], 51), (c - p["jawW"], 101)
    c1, c2 = (c - p["cheekW"] - 3, 60), (c - p["cheekW"], 90)
    n = p["ruffN"]
    for i in range(1, n * 2 + 1):
        t = i / (n * 2)
        x, y = bezier(a, c1, c2, b, t)
        if i % 2 == 1:  # tish uchi — tashqariga va biroz pastga
            k = p["ruffLen"] * math.sin(math.pi * t) + 1.5
            x, y = x - k, y + k * 0.55
        left.append((x, y))
    left += [(c - 8, 107), (c, 109)]
    right = mirror(left[1:-1])[::-1]
    return left + right


def ear_inner(p, side):
    c = 64
    ew = 9 * p["earW"]
    pts = [(c - ew - 3, 42), (c - p["earX"] + 1.5, 43 - p["earH"] + 6), (c - p["skullW"] + 4, 50)]
    return pts if side < 0 else mirror(pts)


def face_light(p):
    c = 64
    left = [(c - 8, 70), (c - p["cheekW"] * 0.5, 75), (c - p["cheekW"] * 0.66, 87),
            (c - p["jawW"] * 0.85, 99), (c - 7, 107), (c, 109)]
    return left + mirror(left[:-1])[::-1]


def muzzle(p):
    c, top, L, W = 64, 57, p["muzL"], p["muzW"]
    return (f"M{f(c-5)},{top} C{f(c-6)},{f(top+L*0.45)} {f(c-W)},{f(top+L*0.6)} {f(c-W)},{f(top+L*0.85)} "
            f"Q{f(c-W)},{f(top+L+6)} {c},{f(top+L+7)} Q{f(c+W)},{f(top+L+6)} {f(c+W)},{f(top+L*0.85)} "
            f"C{f(c+W)},{f(top+L*0.6)} {f(c+6)},{f(top+L*0.45)} {f(c+5)},{top}Z")


def eye(x, y, flip, color):
    d = -1 if flip else 1
    path = (f"M{f(x-6.5*d)},{f(y+1.5)} Q{f(x-1*d)},{f(y-4.5)} {f(x+6*d)},{f(y-1.5)} "
            f"Q{f(x+1*d)},{f(y+3.2)} {f(x-6.5*d)},{f(y+1.5)}Z")
    return (f'<path d="{path}" fill="{color}" stroke="#120f0c" stroke-width="1.3" stroke-linejoin="round"/>'
            f'<circle cx="{f(x)}" cy="{f(y)}" r="1.9" fill="#0b0908"/>'
            f'<circle cx="{f(x+0.9*d)}" cy="{f(y-0.9)}" r="0.7" fill="#fff" opacity=".9"/>')


def habitat(kind, bg_dark):
    """Fon pastidagi yashash muhiti silueti."""
    col = bg_dark
    if kind == "forest":
        trees = "".join(f'<path d="M{x},{y} l-7,16 h14z M{x},{y+8} l-9,18 h18z" fill="{col}"/>'
                        for x, y in [(14, 70), (28, 64), (100, 66), (115, 72), (8, 82), (120, 84)])
        return trees + f'<rect x="0" y="100" width="128" height="28" fill="{col}"/>'
    if kind == "desert":
        return (f'<path d="M0,96 Q30,82 56,96 T128,92 V128 H0Z" fill="{col}" opacity=".85"/>'
                f'<path d="M0,108 Q40,96 80,110 T128,106 V128 H0Z" fill="{col}"/>')
    if kind == "mountain":
        return (f'<path d="M0,98 L18,70 L30,84 L44,62 L60,90 L76,66 L96,88 L110,68 L128,92 V128 H0Z" fill="{col}" opacity=".9"/>'
                f'<path d="M44,62 L38,72 L44,70 L49,74Z M110,68 L105,76 L111,74Z" fill="#fff" opacity=".35"/>')
    if kind == "steppe":
        grass = "".join(f'<path d="M{x},104 q2,-9 4,-12 M{x+3},104 q1,-7 -2,-10" stroke="{col}" stroke-width="1.6" fill="none"/>'
                        for x in range(4, 128, 9))
        return f'<path d="M0,100 Q64,90 128,100 V128 H0Z" fill="{col}"/>' + grass
    if kind == "swamp":
        reeds = "".join(f'<path d="M{x},104 l1,-22" stroke="{col}" stroke-width="2"/><ellipse cx="{x+1}" cy="{80}" rx="1.6" ry="4" fill="{col}"/>'
                        for x in (10, 16, 110, 118))
        return f'<rect x="0" y="102" width="128" height="26" fill="{col}"/>' + reeds
    if kind in ("snow", "ice"):
        flakes = "".join(f'<circle cx="{x}" cy="{y}" r="1.3" fill="#fff" opacity=".7"/>'
                         for x, y in [(16, 30), (28, 52), (106, 34), (116, 58), (20, 76), (110, 80), (40, 20), (90, 22)])
        return f'<path d="M0,100 Q32,88 64,98 T128,96 V128 H0Z" fill="#eef6fb" opacity=".55"/>' + flakes
    if kind == "tar":
        return (f'<path d="M0,98 Q40,90 70,100 T128,96 V128 H0Z" fill="{col}"/>'
                f'<ellipse cx="22" cy="110" rx="14" ry="3" fill="#000" opacity=".5"/><ellipse cx="108" cy="114" rx="12" ry="3" fill="#000" opacity=".5"/>')
    if kind == "fire":
        return "".join(f'<path d="M{x},128 q-6,-18 2,-30 q2,10 6,8 q-2,-12 6,-20 q4,16 2,42z" fill="#ff7a1a" opacity=".45"/>'
                       for x in (2, 98, 112))
    if kind == "sky":
        return ""
    return ""


def extras(kind):
    if kind == "aurora":
        return ('<path d="M-10,40 C20,10 50,48 80,22 S120,30 140,8" stroke="#3dffb0" stroke-width="9" fill="none" opacity=".35"/>'
                '<path d="M-10,56 C24,30 56,62 86,38 S122,44 140,24" stroke="#5ae0ff" stroke-width="6" fill="none" opacity=".3"/>')
    if kind == "stars":
        pts = [(18, 26), (30, 14), (104, 18), (114, 36), (12, 52), (118, 60), (24, 86), (106, 92), (64, 10)]
        star = "".join(f'<path d="M{x},{y-3.5} L{x+1},{y-1} L{x+3.5},{y} L{x+1},{y+1} L{x},{y+3.5} L{x-1},{y+1} L{x-3.5},{y} L{x-1},{y-1}Z" fill="#ffe08a"/>'
                       for x, y in pts)
        halo = ('<defs><radialGradient id="halo"><stop offset=".55" stop-color="#ffd24a" stop-opacity=".55"/>'
                '<stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>'
                '<circle cx="64" cy="60" r="52" fill="url(#halo)"/>')
        return halo + star
    if kind == "ice":
        return "".join(f'<path d="M{x},0 l4,{h} l4,-{h}z" fill="#e8f8ff" opacity=".75"/>' for x, h in [(10, 14), (22, 9), (96, 12), (108, 16)])
    if kind == "bones":
        return ('<g stroke="#e9dcc3" stroke-width="3" stroke-linecap="round" opacity=".55">'
                '<path d="M8,112 L30,104"/><path d="M98,108 L120,116"/></g>')
    return ""


def overlay(kind, p):
    """Boshdan keyin chiziladigan qismlar."""
    if kind == "chain":
        links = "".join(f'<ellipse cx="{x}" cy="{116 - abs(x - 64) * 0.18}" rx="6" ry="3.6" fill="none" stroke="#b9bcc4" stroke-width="2.6" transform="rotate({-12 if x < 64 else 12} {x} {116})"/>'
                        for x in range(8, 128, 11))
        return f'<g opacity=".95">{links}</g>'
    return ""


def wolf_head(p, uid):
    c = 64
    g = []
    g.append(f'<path d="{poly(head_outline(p))}" fill="url(#fur{uid})" stroke="{p["dark"]}" stroke-width="1.2" stroke-linejoin="round"/>')
    for side in (-1, 1):
        g.append(f'<path d="{poly(ear_inner(p, side))}" fill="{p["dark"]}" opacity=".75"/>')
        g.append(f'<path d="{poly([(x, y + 3) for x, y in ear_inner(p, side)][:2] + [ear_inner(p, side)[2]])}" fill="{p["light"]}" opacity=".35"/>')
    g.append(f'<path d="{poly(face_light(p))}" fill="{p["light"]}"/>')
    # Qosh ustidagi och dogʻlar (koʻp boʻrilarda bor)
    for x in (c - 13, c + 13):
        g.append(f'<ellipse cx="{x}" cy="55" rx="5" ry="2.6" fill="{p["light"]}" opacity=".8"/>')
    marks = p["marks"]
    if marks == "stripe":
        g.append(f'<path d="M{c-4},38 L{c+4},38 L{c+2.5},60 L{c-2.5},60Z" fill="{p["dark"]}" opacity=".85"/>')
    if marks == "brows":
        g.append(f'<path d="M{c-20},58 Q{c-13},53 {c-7},57 M{c+20},58 Q{c+13},53 {c+7},57" stroke="{p["dark"]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
    if marks == "mottled":
        for x, y, r in [(c - 22, 72, 3), (c + 20, 76, 2.6), (c - 16, 46, 2.4), (c + 15, 45, 2.8), (c - 26, 86, 2.2), (c + 24, 88, 2.4)]:
            g.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#a1673d" opacity=".8"/>')
    # Yonoq junlari teksturasi
    for d in (-1, 1):
        for x, y in [(p["cheekW"] * 0.72, 74), (p["cheekW"] * 0.8, 82), (p["cheekW"] * 0.7, 90)]:
            g.append(f'<path d="M{f(c + d * x)},{y} l{f(-d * 5)},3 l{f(-d * 1)},-4" stroke="{p["dark"]}" stroke-width="1.2" fill="none" opacity=".5" stroke-linejoin="round"/>')
    g.append(f'<path d="{muzzle(p)}" fill="{p["muzzle"]}" stroke="{p["dark"]}" stroke-opacity=".35" stroke-width="1.1"/>')
    # Burun koʻprigidagi soya
    g.append(f'<path d="M{c-3},58 Q{c},{57 + p["muzL"] * 0.55} {c+3},58" fill="{p["dark"]}" opacity=".18"/>')
    if marks == "lips":  # Iberiya: oq lab va qora tumshuq chizigʻi (signatus)
        top, L = 57, p["muzL"]
        g.append(f'<path d="M{c-p["muzW"]+1},{f(top+L*0.9)} Q{c},{f(top+L+9)} {c+p["muzW"]-1},{f(top+L*0.9)}" stroke="#fff" stroke-width="3" fill="none"/>')
        g.append(f'<path d="M{c-2},40 L{c+2},40 L{c+1.5},{f(top+L*0.7)} L{c-1.5},{f(top+L*0.7)}Z" fill="{p["dark"]}"/>')
    # Burun va ogʻiz
    ny = 57 + p["muzL"] + 1
    g.append(f'<path d="M{c-6},{f(ny-3)} Q{c},{f(ny-6)} {c+6},{f(ny-3)} Q{c+5},{f(ny+2)} {c},{f(ny+3)} Q{c-5},{f(ny+2)} {c-6},{f(ny-3)}Z" fill="{p["nose"]}"/>')
    g.append(f'<ellipse cx="{c-1.8}" cy="{f(ny-3)}" rx="1.6" ry=".9" fill="#fff" opacity=".35"/>')
    g.append(f'<path d="M{c},{f(ny+3)} V{f(ny+6)} M{c-5},{f(ny+7.5)} Q{c},{f(ny+9)} {c},{f(ny+6)} Q{c},{f(ny+9)} {c+5},{f(ny+7.5)}" stroke="{p["nose"]}" stroke-width="1.3" fill="none" stroke-linecap="round"/>')
    # Koʻzlar
    glow = p["cls"] == "myth"
    if glow:
        for x in (c - 13, c + 13):
            g.append(f'<circle cx="{x}" cy="62" r="7" fill="{p["eye"]}" opacity=".28"/>')
    g.append(eye(c - 13, 62, False, p["eye"]))
    g.append(eye(c + 13, 62, True, p["eye"]))
    return "".join(g)


def render(level, spec):
    p = dict(BASE)
    p.update(spec)
    uid = str(level)
    bg1, bg2 = p["bg"]
    ring, rw = RING[p["cls"]]
    s = p["s"]
    defs = (f'<radialGradient id="bg{uid}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></radialGradient>'
            f'<linearGradient id="fur{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{p["dark"]}"/>'
            f'<stop offset=".45" stop-color="{p["fur"]}"/><stop offset="1" stop-color="{p["fur"]}"/></linearGradient>'
            f'<clipPath id="clip{uid}"><circle cx="64" cy="64" r="62"/></clipPath>')
    bg = (f'<circle cx="64" cy="64" r="62" fill="url(#bg{uid})"/>' + extras(p["extra"]) + habitat(p["habitat"], bg2))
    if p["extra"] == "twin":  # Geri va Freki — ikki bosh
        heads = (f'<g transform="translate(36 78) scale({s}) translate(-64 -72)">{wolf_head(p, uid)}</g>'
                 f'<g transform="translate(92 78) scale({s}) translate(-64 -72)">{wolf_head(dict(p, fur="#9a9ea6", dark="#4a4e55", light="#e3e6ea", muzzle="#c3c7cd"), uid + "b")}</g>')
        defs += (f'<linearGradient id="fur{uid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4e55"/>'
                 f'<stop offset=".45" stop-color="#9a9ea6"/><stop offset="1" stop-color="#9a9ea6"/></linearGradient>')
        runes = '<text x="64" y="26" font-size="13" text-anchor="middle" fill="#f5c04a" opacity=".55" font-family="serif">ᚷ ᚠ</text>'
        bg += runes
    else:
        heads = f'<g transform="translate(64 76) scale({f(s * 1.12)}) translate(-64 -72)">{wolf_head(p, uid)}</g>'
    frame = f'<circle cx="64" cy="64" r="{f(62 - rw / 2)}" fill="none" stroke="{ring}" stroke-width="{rw}"/>'
    if p["cls"] == "myth":
        frame += f'<circle cx="64" cy="64" r="{f(62 - rw - 2)}" fill="none" stroke="{ring}" stroke-width="1" opacity=".6"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
            f'<defs>{defs}</defs><g clip-path="url(#clip{uid})">{bg}{heads}{overlay(p["extra"], p)}</g>{frame}</svg>')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    uris = {}
    for level, spec in SPECIES.items():
        svg = render(level, spec)
        with open(os.path.join(OUT_DIR, f"{level}.svg"), "w") as fh:
            fh.write(svg)
        uris[level] = "data:image/svg+xml," + urllib.parse.quote(svg, safe=" =:/,;'()-.")
    with open(os.path.join(ROOT, "public", "assets", "wolves.js"), "w") as fh:
        fh.write("/* AVTOMATIK YARATILGAN: python3 tools/gen_wolf_avatars.py — qoʻlda tahrirlamang. */\n")
        fh.write("window.BW_WOLVES = " + json.dumps(uris, ensure_ascii=False) + ";\n")
    print(f"{len(SPECIES)} ta avatar yozildi: {OUT_DIR}")


if __name__ == "__main__":
    main()
